import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { initDatabase, deleteDatabaseAsync } from '../database/init';
import { seedDemoData } from '../database/seed-demo-data';
import { getTransacoes, getUsuarios } from '../database/operations';
import { UserProvider, useUser } from '../context/UserContext';

function RootLayoutInner() {
  const { setUsuarioAtivo } = useUser();
  const [dbInitialized, setDbInitialized] = useState(false);
  const [initAttempts, setInitAttempts] = useState(0);

  useEffect(() => {
    const initWithRetry = async () => {
      try {
        await initDatabase();

        if (Platform.OS === 'web') {
          const transacoes = await getTransacoes();
          if (transacoes.length === 0) {
            await seedDemoData();
          }
        }

        // Carregar o primeiro usuário como ativo
        const usuarios = await getUsuarios();
        if (usuarios.length > 0) {
          setUsuarioAtivo(usuarios[0]);
        }

        setDbInitialized(true);
      } catch (error: any) {
        console.error('❌ Erro ao inicializar banco de dados:', error);

        if (initAttempts === 0) {
          setInitAttempts(1);
          try {
            await deleteDatabaseAsync();
            await new Promise(resolve => setTimeout(resolve, 500));
            await initDatabase();

            const usuarios = await getUsuarios();
            if (usuarios.length > 0) setUsuarioAtivo(usuarios[0]);

            setDbInitialized(true);
          } catch (retryError) {
            setDbInitialized(true);
          }
        } else {
          setDbInitialized(true);
        }
      }
    };

    initWithRetry();
  }, []);

  if (!dbInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#10b981' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Finance Manager' }} />
      <Stack.Screen name="relatorio" options={{ title: 'Relatório' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <UserProvider>
      <RootLayoutInner />
    </UserProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
});
