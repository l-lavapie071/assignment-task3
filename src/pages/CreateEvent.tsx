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
} from "react-native";
import uuid from "react-native-uuid";
import { RectButton } from "react-native-gesture-handler";
import { Feather } from "@expo/vector-icons";
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

  const handleCreateEvent = async () => {
    if (!name || !description || !volunteersNeeded) {
      Alert.alert("Validation Error", "Please fill in all fields.");
      return;
    }

    // Combine date & time into ISO string
    const dateTimeISO = date.toISOString();

    try {
      const newEvent = {
        id: uuid.v4().toString(),
        name,
        description,
        dateTime: dateTimeISO,
        imageUrl:
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

      <RectButton style={styles.createButton} onPress={handleCreateEvent}>
        <Feather name="check" size={20} color="#FFF" />
        <Text style={styles.createButtonText}>Create Event</Text>
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
});
