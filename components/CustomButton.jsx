import { ActivityIndicator, Image, Text, TouchableOpacity, View } from 'react-native';

const CustomButton = ({ 
  title, 
  handlePress, 
  containerStyles, 
  textStyles, 
  isLoading,
  icon // Prop para o ícone (source da imagem)
}) => {
  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      // Combina estilos padrão e customizados do container
      className={`bg-secondary rounded-xl min-h-[62px] flex-row justify-center items-center ${containerStyles} ${isLoading ? 'opacity-50' : ''}`}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator animating={isLoading} color="#fff" size="small" />
      ) : (
        // ATENÇÃO AQUI: Envolve o ícone e o texto em uma View para garantir que sejam irmãos.
        // Isso resolve o erro "Text strings must be rendered within a <Text> component."
        <View className="flex-row items-center justify-center"> 
          {icon && ( // Renderiza o ícone se a prop 'icon' for fornecida
            <Image 
              source={icon} 
              resizeMode="contain" 
              className="w-5 h-5 mr-2" // Tailwind para tamanho e margem
              tintColor="#FFFFFF" // Assume que você quer o ícone branco
              // Adiciona estilos inline para garantir que o Tailwind seja aplicado corretamente para o ícone
              style={{ width: 20, height: 20, marginRight: 8 }} 
            />
          )}
          <Text className={`text-primary font-psemibold text-lg ${textStyles}`}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default CustomButton;
