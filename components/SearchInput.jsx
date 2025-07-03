import { useState } from "react";
import { View, TextInput, TouchableOpacity, Image, Alert } from "react-native";

import { icons } from "../constants";
import { usePathname, useRouter } from "expo-router";

const SearchInput = ({initialQuery}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery || '');

  return (
    <View className="w-full h-16 px-4 border-black-200 bg-black-100 rounded-2xl flex-row focus:border-secondary items-center border-2 space-x-4">
      <TextInput
        className="text-base mt--0.5 text-white flex-1 font-pregular"
        value={query}
        placeholder="Search for a video topic"
        placeholderTextColor="orange"
        onChangeText={(e) => setQuery(e)}
      />

      <TouchableOpacity
        onPress={() => {
          if (!query) {
            return Alert.alert('Missing query', "Please input something to search results across database");
          }
          if (pathname.startsWith('/search')) {
            router.setParams({ query });
          } else {
            router.push(`/search/${query}`);
          }
        }}
      >
        <Image
          source={icons.search}
          className="w-6 h-6"
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );
};

export default SearchInput;