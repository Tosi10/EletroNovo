import { useState } from "react";
import { Image, Text, TextInput, TouchableOpacity, View } from "react-native";

import { icons } from "../constants";

const FormField = ({
  title,
  value,
  placeholder,
  handleChangeText,
  otherStyles,
  keyboardType,
  multiline,
  numberOfLines,
  secureTextEntry, // ✅ agora aceito por fora
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const isPasswordField = secureTextEntry === true;

  return (
    <View className={`space-y-2 ${otherStyles}`}>
      <Text className="text-lg text-black font-bold">{title}</Text>

      <View
        className={`w-full px-4 bg-gray-100 rounded-2xl border-2 border-black-200 ${
          multiline ? 'py-4' : 'h-16 flex-row items-center'
        }`}
      >
        <TextInput
          className="flex-1 text-black font-psemibold text-base"
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#7B7B8B"
          onChangeText={handleChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          secureTextEntry={isPasswordField && !showPassword}
          textAlignVertical={multiline ? 'top' : 'center'}
          {...props}
        />

        {/* Ícone de visibilidade para campos de senha */}
        {isPasswordField && (
          <View className="ml-2">
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Image
                source={showPassword ? icons.eyeHide : icons.eye}
                className="w-6 h-6"
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

export default FormField;
