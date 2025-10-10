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

  // Choose or Take a Photo

  const pickImage = async (fromCamera: boolean = false) => {
    try {
      // Request permissions
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

  // Upload Image to FreeImage.host
  const uploadImage = async (picked: any) => {
    try {
      setUploading(true);

      const fileUri = picked.uri;

      // Convert image to base64
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
        // Get file info safely
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
        console.error("Upload failed:", data);
        Alert.alert("Error", "Failed to upload image. Try again.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      Alert.alert("Error", "Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  // Create Event
  const handleCreateEvent = async () => {
    if (!name || !description || !volunteersNeeded) {
      Alert.alert("Validation Error", "Please fill in all fields.");
      return;
    }

    const dateTimeISO = date.toISOString();

    try {
      const newEvent = {
        id: uuid.v4().toString(),
        name,
        description,
        dateTime: dateTimeISO,
        imageUrl:
          image?.url ||
          "https://i1.wp.com/www.slashfilm.com/wp/wp-content/images/Minions-movie-2.jpg",
        organizerId: currentUser?.id,
        position,
        volunteersNeeded: Number(volunteersNeeded),
        volunteersIds: [],
      };

      await createEvent(newEvent);
      Alert.alert("Success", "Event created successfully!");
      navigation.navigate("EventsMap");
    } catch (error) {
      console.error("Failed to create event:", error);
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
      <Text style={styles.heading}>Create New Event</Text>

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
          <View>
            <Text>{image.name}</Text>
            <Text>{image.size}</Text>
          </View>
        </View>
      )}

      <RectButton style={styles.createButton} onPress={handleCreateEvent}>
        {/* <Feather name="check" size={20} color="#FFF" /> */}
        <Text style={styles.createButtonText}>Save</Text>
      </RectButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  heading: { fontSize: 24, fontWeight: "700", marginBottom: 20 },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 6 },
  input: {
    backgroundColor: "#f2f2f2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00A3FF",
    padding: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  createButtonText: { color: "#fff", fontWeight: "600", marginLeft: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
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
  uploadButtonText: {
    color: "#FFF",
    fontWeight: "600",
    marginLeft: 6,
  },
  imagePreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  imageThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
  },
});
