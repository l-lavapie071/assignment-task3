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
import { User } from "../types/User";
import { fetchEvent, volunteerForEvent, fetchUser } from "../services/api";
import { getFromNetworkFirst } from "../services/caching";

type RootStackParamList = {
  EventDetails: { eventId: string };
};
type Props = StackScreenProps<RootStackParamList, "EventDetails">;

export default function EventDetails({ route, navigation }: Props) {
  const { eventId } = route.params;
  const auth = useContext(AuthenticationContext);
  const currentUser = auth?.value;

  const [event, setEvent] = useState<Event | null>(null);
  const [organizer, setOrganizer] = useState<User | null>(null);

  // Fetch Event
  useEffect(() => {
    const loadEvent = async () => {
      try {
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
      } catch (err) {
        Alert.alert("Error", "Failed to load event.");
      }
    };
    if (eventId) loadEvent();
  }, [eventId]);

  //Fetch Organizer AFTER event is loaded
  useEffect(() => {
    if (!event) return;

    const loadOrganizer = async () => {
      try {
        const organizerData = await fetchUser(event.organizerId);
        console.log(organizerData);
        setOrganizer(organizerData);
      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Failed to load organizer.");
      }
    };
    loadOrganizer();
  }, [event]);

  if (!event) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Event not found.</Text>
      </View>
    );
  }

  const isUserVolunteered = currentUser
    ? event.volunteersIds.includes(currentUser.id)
    : false;
  const isFull = event.volunteersIds.length >= event.volunteersNeeded;

  const handleVolunteer = async () => {
    if (!currentUser) return Alert.alert("Error", "No user logged in");
    if (isFull) return Alert.alert("Team is full");
    if (isUserVolunteered) return;

    try {
      const updatedEvent: Event = {
        ...event,
        volunteersIds: [...event.volunteersIds, currentUser.id],
      };
      const serverEvent = await volunteerForEvent(updatedEvent);
      setEvent(serverEvent);
      await AsyncStorage.setItem(
        `@cached_event_${serverEvent.id}`,
        JSON.stringify(serverEvent)
      );
      Alert.alert("Success", "You have volunteered!");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to update event status.");
    }
  };

  const handleShare = () => {
    Share.share({
      message: `Check out this event: ${event.name}\n${event.description}`,
    });
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
      {/* Header */}
      <View style={styles.header}>
        <RectButton
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={18} color="#00A3FF" />
          <Text style={styles.headerButtonText}>Back</Text>
        </RectButton>

        <Text style={styles.headerTitle}>Event Details</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Event Image */}
      <Image source={{ uri: event.imageUrl }} style={styles.image} />

      {/* Event Name */}
      <Text style={styles.title}>{event.name}</Text>

      {/* Organizer Info */}
      {organizer && (
        <Text style={{ marginBottom: 8, fontSize: 16, fontWeight: "600" }}>
          Organizer: {organizer.name.first} {organizer.name.last}
        </Text>
      )}

      {/* Event Description */}
      <Text style={styles.description}>{event.description}</Text>
      {/* Date/Time and Volunteer Info */}
      <View style={styles.infoRow}>
        {/* Date */}
        <View
          style={[
            styles.infoBox,
            isUserVolunteered
              ? { flex: 1, backgroundColor: "rgba(0,122,255,0.1)" } // same height & subtle blue background
              : isFull
              ? { flex: 1, backgroundColor: "rgba(255,0,0,0.1)" } // full team red
              : {}, // normal
          ]}
        >
          <Feather
            name="calendar"
            size={18}
            color="#007AFF"
            style={{ marginBottom: 4 }}
          />
          <Text style={[styles.infoText, { color: "#007AFF" }]}>
            {new Date(event.dateTime).toLocaleDateString()}{" "}
            {new Date(event.dateTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>

        {/* Volunteer Info */}
        <View
          style={[
            styles.infoBox,
            isUserVolunteered
              ? { backgroundColor: "rgba(0,122,255,0.2)", flex: 1 } // same flex
              : isFull
              ? { backgroundColor: "rgba(255,0,0,0.2)", flex: 1 }
              : { backgroundColor: "rgba(255,165,0,0.2)" },
          ]}
        >
          {isUserVolunteered ? (
            <>
              <Feather
                name="check"
                size={18}
                color="#007AFF"
                style={{ marginBottom: 4 }}
              />
              <Text style={[styles.infoText, { color: "#007AFF" }]}>
                Volunteered
              </Text>
            </>
          ) : isFull ? (
            <>
              <Feather
                name="slash"
                size={18}
                color="#FF3B30"
                style={{ marginBottom: 4 }}
              />
              <Text style={[styles.infoText, { color: "#FF3B30" }]}>
                Team is full
              </Text>
            </>
          ) : (
            <>
              <Feather
                name="users"
                size={18}
                color="#FFA500"
                style={{ marginBottom: 4 }}
              />
              <Text
                style={[
                  styles.infoText,
                  { color: "#FFA500", textAlign: "center" },
                ]}
              >
                {event.volunteersIds.length} of {event.volunteersNeeded}{" "}
                Volunteer(s) needed
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Buttons */}
      {isUserVolunteered ? (
        <View style={[styles.buttonRowEqual, { marginTop: 16 }]}>
          <RectButton style={styles.equalButton} onPress={handleShare}>
            <Feather name="share-2" size={18} color="white" />
            <Text style={styles.buttonText}>Share</Text>
          </RectButton>
          <RectButton style={styles.equalButton} onPress={handleCall}>
            <Feather name="phone" size={18} color="white" />
            <Text style={styles.buttonText}>Call</Text>
          </RectButton>
          <RectButton style={styles.equalButton} onPress={handleText}>
            <Feather name="message-circle" size={18} color="white" />
            <Text style={styles.buttonText}>Text</Text>
          </RectButton>
          <RectButton style={styles.equalButton} onPress={handleShowRoute}>
            <Feather name="map-pin" size={18} color="white" />
            <Text style={styles.buttonText}>Navigate</Text>
          </RectButton>
        </View>
      ) : !isFull ? (
        <View style={styles.buttonRow}>
          <RectButton style={styles.shareButton} onPress={handleShare}>
            <Feather name="share-2" size={18} color="white" />
            <Text style={styles.buttonText}>Share</Text>
          </RectButton>
          <RectButton style={styles.volunteerButton} onPress={handleVolunteer}>
            <Feather name="check" size={18} color="white" />
            <Text style={styles.buttonText}>Volunteer</Text>
          </RectButton>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  error: { fontSize: 18, color: "red" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerButton: { flexDirection: "row", alignItems: "center" },
  headerButtonText: { color: "#00A3FF", fontWeight: "600", marginLeft: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },

  image: { width: "100%", height: 220, borderRadius: 12, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 8 },
  description: { fontSize: 16, color: "#444", marginBottom: 16 },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  infoBox: {
    flex: 0.48,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  infoText: { fontSize: 14, fontWeight: "600" },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    flexWrap: "wrap",
  },
  buttonRowEqual: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  equalButton: {
    flex: 1,
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  volunteerButton: {
    backgroundColor: "#FFA500",
    paddingVertical: 14,
    borderRadius: 8,
    flex: 0.48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  shareButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 8,
    flex: 0.48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "white", fontWeight: "600", marginLeft: 6 },
});
