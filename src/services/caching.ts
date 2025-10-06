import AsyncStorage from "@react-native-async-storage/async-storage";

// Generic "network first, cache fallback"
export const getFromNetworkFirst = async <T>(
  key: string,
  request: Promise<T>
): Promise<T> => {
  try {
    const response = await request;
    await setInCache(key, response);
    return response;
  } catch {
    return getFromCache<T>(key); // will throw if no cache
  }
};

export const setInCache = async (key: string, value: any) => {
  const jsonValue = JSON.stringify(value);
  await AsyncStorage.setItem(key, jsonValue);
};

export const getFromCache = async <T>(key: string): Promise<T> => {
  const json = await AsyncStorage.getItem(key);
  if (!json) throw new Error(`Key "${key}" not in cache`);
  return JSON.parse(json);
};
1