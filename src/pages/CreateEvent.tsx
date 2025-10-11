import React, { useState, useContext } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  Alert,
  Platform,
  TextInput,
  Image,
  ActivityIndicator,
} from "react-native";
import uuid from "react-native-uuid";
import { RectButton } from "react-native-gesture-handler";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { createEvent } from "../services/api";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AuthenticationContext } from "../context/AuthenticationContext";

export default function CreateEvent({ route, navigation }: any) {
  const position = route.params?.position;
  const auth = useContext(AuthenticationContext);
  const currentUser = auth?.value;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [volunteersNeeded, setVolunteersNeeded] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [image, setImage] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) setDate(selectedDate);
  };

  const onChangeTime = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === "ios");
    if (selectedTime) {
      const newDate = new Date(date);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setDate(newDate);
    }
  };

  const pickImage = async (fromCamera: boolean = false) => {
    try {
      const permissionResult = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "Please grant permission to access camera or photos."
        );
        return;
      }

      const result = await (fromCamera
        ? ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.7,
          })
        : ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            quality: 0.7,
          }));

      if (!result.canceled) {
        const picked = result.assets[0];
        await uploadImage(picked);
      }
    } catch (err) {
      console.error("Image selection error:", err);
      Alert.alert("Error", "Failed to select image.");
    }
  };

  const uploadImage = async (picked: any) => {
    try {
      setUploading(true);
      const fileUri = picked.uri;
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: "base64",
      });

      const apiKey = "6d207e02198a847aa98d0a2a901485a5";

      const formData = new FormData();
      formData.append("key", apiKey);
      formData.append("action", "upload");
      formData.append("source", base64);
      formData.append("format", "json");

      const response = await fetch("https://freeimage.host/api/1/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data?.image?.url) {
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        const sizeKB = fileInfo.exists ? (fileInfo.size ?? 0) / 1024 : 0;

        setImage({
          uri: fileUri,
          url: data.image.url,
          name: picked.fileName || "photo.jpg",
          size: sizeKB.toFixed(2) + " KB",
        });

        Alert.alert("Upload Successful", "Image uploaded successfully!");
      } else {
        Alert.alert("Error", "Failed to upload image. Try again.");
      }
    } catch (err) {
      Alert.alert("Error", "Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Event name is required.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Validation Error", "Event description is required.");
      return;
    }
    if (!volunteersNeeded.trim()) {
      Alert.alert(
        "Validation Error",
        "Please specify how many volunteers are needed."
      );
      return;
    }

    const numVolunteers = Number(volunteersNeeded);
    if (isNaN(numVolunteers) || numVolunteers <= 0) {
      Alert.alert(
        "Validation Error",
        "Volunteers Needed must be a positive number."
      );
      return;
    }

    if (!date || isNaN(date.getTime())) {
      Alert.alert("Validation Error", "Please select a valid date and time.");
      return;
    }

    if (!image) {
      Alert.alert("Validation Error", "Please upload an event photo.");
      return;
    }

    const dateTimeISO = date.toISOString();

    try {
      const newEvent = {
        id: uuid.v4().toString(),
        name: name.trim(),
        description: description.trim(),
        dateTime: dateTimeISO,
        imageUrl: image?.url,
        organizerId: currentUser?.id,
        position,
        volunteersNeeded: numVolunteers,
        volunteersIds: [],
      };

      await createEvent(newEvent);
      Alert.alert("Success", "Event created successfully!");
      navigation.navigate("EventsMap");
    } catch (error) {
      Alert.alert("Error", "Failed to create event. Please try again.");
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        padding: 16,
        paddingTop: StatusBar.currentHeight || 50,
      }}
    >
      {/* Header Section */}
      <View style={styles.header}>
        <RectButton
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={18} color="#00A3FF" />
          <Text style={styles.headerButtonText}>Back</Text>
        </RectButton>

        <Text style={styles.heading}>Create New Event</Text>

        <RectButton
          style={styles.headerButton}
          onPress={() => navigation.navigate("EventsMap")}
        >
          <Feather name="x" size={18} color="#FF3B30" />
          <Text style={[styles.headerButtonText, { color: "#FF3B30" }]}>
            Cancel
          </Text>
        </RectButton>
      </View>

      {/* Divider Line */}
      <View style={styles.divider} />

      {/* Form Fields */}
      <Text style={styles.label}>Event Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Event Name"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>About</Text>
      <TextInput
        style={[styles.input, { height: 100 }]}
        placeholder="Event Description"
        multiline
        value={description}
        onChangeText={setDescription}
      />

      <Text style={styles.label}>Volunteers Needed</Text>
      <TextInput
        style={styles.input}
        placeholder="Number of Volunteers"
        keyboardType="numeric"
        value={volunteersNeeded}
        onChangeText={(text) =>
          setVolunteersNeeded(text.replace(/[^0-9]/g, ""))
        }
      />

      <Text style={styles.label}>Date & Time</Text>
      <View style={styles.row}>
        <RectButton
          style={[styles.dateButton, { flex: 1, marginRight: 8 }]}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateButtonText}>
            {date.toISOString().split("T")[0]}
          </Text>
        </RectButton>

        <RectButton
          style={[styles.dateButton, { flex: 1 }]}
          onPress={() => setShowTimePicker(true)}
        >
          <Text style={styles.dateButtonText}>
            {date.toTimeString().slice(0, 5)}
          </Text>
        </RectButton>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={onChangeDate}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={date}
          mode="time"
          display="default"
          onChange={onChangeTime}
        />
      )}

      <Text style={styles.label}>Event Photo</Text>
      <View style={styles.row}>
        <RectButton
          style={[styles.uploadButton, { marginRight: 8 }]}
          onPress={() => pickImage(true)}
        >
          <Feather name="camera" size={18} color="#FFF" />
          <Text style={styles.uploadButtonText}>Camera</Text>
        </RectButton>
        <RectButton
          style={styles.uploadButton}
          onPress={() => pickImage(false)}
        >
          <Feather name="image" size={18} color="#FFF" />
          <Text style={styles.uploadButtonText}>Gallery</Text>
        </RectButton>
      </View>

      {uploading && (
        <ActivityIndicator
          size="small"
          color="#00A3FF"
          style={{ margin: 10 }}
        />
      )}

      {image && (
        <View style={styles.imagePreview}>
          <Image source={{ uri: image.uri }} style={styles.imageThumb} />
          <View style={{ flex: 1 }}>
            <Text style={styles.imageText}>{image.name}</Text>
            <Text style={styles.imageText}>{image.size}</Text>
          </View>
        </View>
      )}

      <RectButton style={styles.createButton} onPress={handleCreateEvent}>
        <Text style={styles.createButtonText}>Save</Text>
      </RectButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
  },

  headerButtonText: {
    marginLeft: 4,
    fontWeight: "600",
    color: "#00A3FF",
  },

  heading: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    flex: 1,
  },

  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginBottom: 16,
  },

  label: { fontSize: 16, fontWeight: "600", marginBottom: 6 },
  input: {
    backgroundColor: "#f2f2f2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: "#00A3FF",
    padding: 14,
    borderRadius: 12,
    marginTop: 20,
    alignItems: "center",
  },
  createButtonText: { color: "#fff", fontWeight: "600" },
  row: { flexDirection: "row", marginBottom: 16 },
  dateButton: {
    backgroundColor: "#f2f2f2",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  dateButtonText: { fontSize: 16 },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00A3FF",
    padding: 12,
    borderRadius: 8,
    flex: 1,
  },
  uploadButtonText: { color: "#FFF", fontWeight: "600", marginLeft: 6 },
  imagePreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
    height: 160,
  },
  imageThumb: {
    width: 130,
    height: "100%",
    borderRadius: 10,
    marginRight: 12,
    resizeMode: "contain",
  },
  imageText: {
    flexShrink: 1,
    textAlign: "justify",
  },
});
