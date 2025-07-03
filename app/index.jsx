import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ImageBackground, ScrollView, StyleSheet, Text, View } from 'react-native';
import CustomButton from '../components/CustomButton';
import { images } from '../constants';
import { useGlobalContext } from '../context/GlobalProvider';

export default function Index() {
  const { isLoading, isLogged } = useGlobalContext();

  if (!isLoading && isLogged) return <Redirect href="/home" />;

  return (
    <ImageBackground
      source={images.cardio2}
      resizeMode="cover"
      style={{ flex: 1, width: '100%', height: '100%' }}
    >
      <View
        pointerEvents="none"
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0,0,0,0.2)',
          zIndex: 1,
        }}
      />
      <ScrollView contentContainerStyle={{ flexGrow: 1, zIndex: 2 }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: '84vh', paddingHorizontal: 16 }}>
          <View style={{ marginTop: 20 }}>
            <Text style={{ color: '#fff', fontSize: 48, fontWeight: 'bold', textAlign: 'center' }}>
              V6 Core
            </Text>
          </View>
          <Text style={{ color: '#ccc', fontSize: 16, marginTop: 28, textAlign: 'center' }}>
            Eletrocardiogramas.
          </Text>
          <CustomButton
            title="Continue with E-mail"
            handlePress={() => router.push('/sign-in')}
            containerStyles=""
          />
        </View>
      </ScrollView>
      <StatusBar backgroundColor="#161622" style="light" />
    </ImageBackground>
  );
}