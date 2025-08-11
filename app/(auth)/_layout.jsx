import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

const AuthLayout = () => {
  return (
    <>
      <Stack>
        
        <Stack.Screen 
          name="sign-in" 
          options={{
            headerShown: false, 
          }} 
        />
        <Stack.Screen 
          name="sign-up" 
          options={{
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="forgot-password" 
          options={{
            headerShown: false,
          }} 
        />
      </Stack>
      {/* Configura a StatusBar para ser consistente */}
      <StatusBar backgroundColor="#161622" style="light" />
    </>
  );
};

export default AuthLayout;
