import React, { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
  Linking,
  StatusBar,
} from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { Feather } from "@expo/vector-icons";
import { RectButton } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthenticationContext } from "../context/AuthenticationContext";
import { Event } from "../types/Events";
import { fetchEvent } from "../services/api";
import { getFromNetworkFirst } from "../services/caching";

// Types for navigation
type RootStackParamList = {
  EventDetails: { eventId: string };
};
type Props = StackScreenProps<RootStackParamList, "EventDetails">;

export default function EventDetails({ route, navigation }: Props) {
  const { eventId } = route.params;
  const auth = useContext(AuthenticationContext);
  const currentUser = auth?.value;

  const [event, setEvent] = useState<Event | null>(null);

  useEffect(() => {
    const loadEvent = async () => {
      const cacheKey = `@cached_event_${eventId}`;

      const data = await getFromNetworkFirst<Event>(
        cacheKey,
        fetchEvent(eventId)
      );

      if (data) {
        setEvent(data);
      } else {
        Alert.alert("Error", "Could not load event from network or cache.");
      }
    };

    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  if (!event) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Event not found.</Text>
      </View>
    );
  }

  // Derived state logic
  const isUserVolunteered = currentUser
    ? event.volunteersIds.includes(currentUser.id)
    : false;
  const isFull = event.volunteersIds.length >= event.volunteersNeeded;

  const statusText = isUserVolunteered
    ? "Volunteered"
    : isFull
    ? "Team is full"
    : `${event.volunteersIds.length} / ${event.volunteersNeeded} volunteers`;

  // Handle volunteering
  const handleVolunteer = async () => {
    if (!currentUser) return Alert.alert("Error", "No user logged in");
    if (isFull) return Alert.alert("Team is full");
    if (isUserVolunteered) return;

    try {
      const updatedEvent = {
        ...event,
        volunteersIds: [...event.volunteersIds, currentUser.id],
      };

      setEvent(updatedEvent);

      // Update cache immediately
      await AsyncStorage.setItem(
        `@cached_event_${event.id}`,
        JSON.stringify(updatedEvent)
      );

      Alert.alert("Success", "You have volunteered!");
    } catch (err) {
      Alert.alert("Error", "Failed to update event status.");
      console.error(err);
    }
  };

  const handleCall = () => {
    Linking.openURL("tel:1234567890").catch(() =>
      Alert.alert("Error", "Unable to open dialer")
    );
  };

  const handleText = () => {
    Linking.openURL("sms:1234567890").catch(() =>
      Alert.alert("Error", "Unable to open messaging app")
    );
  };

  const handleShare = () => {
    Share.share({
      message: `Check out this event: ${event.name}\n${event.description}`,
    });
  };

  const handleShowRoute = () => {
    const { latitude, longitude } = event.position;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "Unable to open maps")
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        padding: 16,
        paddingTop: StatusBar.currentHeight || 50,
      }}
    >
      <Image source={{ uri: event.imageUrl }} style={styles.image} />

      <Text style={styles.title}>{event.name}</Text>
      <Text style={styles.date}>
        {new Date(event.dateTime).toLocaleString()}
      </Text>
      <Text style={styles.description}>{event.description}</Text>

      <View style={styles.statusBox}>
        <Text style={styles.status}>{statusText}</Text>
      </View>

      <View style={styles.buttonRow}>
        {!isFull && !isUserVolunteered && (
          <RectButton style={styles.actionButton} onPress={handleVolunteer}>
            <Text style={styles.actionButtonText}>Volunteer</Text>
          </RectButton>
        )}

        {isUserVolunteered && (
          <>
            <RectButton style={styles.iconButton} onPress={handleCall}>
              <Feather name="phone" size={20} color="white" />
            </RectButton>
            <RectButton style={styles.iconButton} onPress={handleText}>
              <Feather name="message-circle" size={20} color="white" />
            </RectButton>
          </>
        )}

        <RectButton style={styles.iconButton} onPress={handleShare}>
          <Feather name="share-2" size={20} color="white" />
        </RectButton>

        <RectButton style={styles.iconButton} onPress={handleShowRoute}>
          <Feather name="map-pin" size={20} color="white" />
        </RectButton>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  error: { fontSize: 18, color: "red" },
  image: { width: "100%", height: 220, borderRadius: 12, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 4 },
  date: { fontSize: 14, color: "#666", marginBottom: 12 },
  description: { fontSize: 16, color: "#444", marginBottom: 16 },
  statusBox: {
    backgroundColor: "#eee",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  status: { fontSize: 16, fontWeight: "600" },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  actionButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  actionButtonText: { color: "white", fontWeight: "600" },
  iconButton: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 50,
  },
});
