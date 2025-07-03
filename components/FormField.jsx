import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image } from "react-native";

import { icons } from "../constants";

const FormField = ({
  title,
  value,
  placeholder,
  handleChangeText,
  otherStyles,
  keyboardType, // Propriedade para tipo de teclado
  multiline,    // Nova prop: true para campo de múltiplas linhas
  numberOfLines, // Nova prop: número de linhas visíveis
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className={`space-y-2 ${otherStyles}`}>
      <Text className="text-base text-gray-100 font-pmedium">{title}</Text>

      <View 
        // Classes Tailwind para o contêiner do TextInput
        // Se 'multiline' for true, ajusta o padding vertical e remove altura fixa para permitir expansão.
        // Se 'multiline' for false (padrão), mantém a altura fixa e centraliza o conteúdo.
        className={`w-full px-4 bg-black-100 rounded-2xl border-2 border-black-200 ${
          multiline ? 'py-4' : 'h-16 flex-row items-center' 
        }`}
      >
        <TextInput
          className={`flex-1 text-white font-psemibold text-base ${
            multiline ? '' : 'focus:border-secondary' // Estilo de foco (se houver)
          }`}
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#7B7B8B"
          onChangeText={handleChangeText}
          secureTextEntry={title === "Password" && !showPassword}
          keyboardType={keyboardType} // Passa o tipo de teclado
          multiline={multiline} // Habilita o modo multiline no TextInput nativo
          numberOfLines={numberOfLines} // Define o número de linhas visíveis
          textAlignVertical={multiline ? 'top' : 'center'} // Alinha o texto no topo para multilinhas
          {...props}
        />

        {/* Lógica para mostrar/esconder senha, se o campo for de senha */}
        {title === "Password" && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Image
              source={!showPassword ? icons.eye : icons.eyeHide}
              className="w-6 h-6"
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default FormField;
