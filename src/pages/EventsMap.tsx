import React, { useContext, useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Platform,
  StatusBar,
  Image,
  Alert,
} from "react-native";
import { RectButton } from "react-native-gesture-handler";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthenticationContext } from "../context/AuthenticationContext";
import { Event } from "../types/Events";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import customMapStyle from "../../map-style.json";
import * as MapSettings from "../constants/MapSettings";
import mapMarkerImg from "../images/map-marker.png";
import { fetchEvents } from "../services/api"; //

const EVENTS_STORAGE_KEY = "@cached_events";
const QUERY_CACHE_KEY = "@cached_query";

export default function EventsMap({ navigation }: any) {
  const auth = useContext(AuthenticationContext);
  const currentUser = auth?.value;
  const [events, setEvents] = useState<Event[]>([]);
  const [queryData, setQueryData] = useState<any>(null);
  const mapViewRef = useRef<MapView>(null);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        // Fetch Events
        const eventsData = await fetchEvents();

        const upcoming = eventsData.filter(
          (event: Event) => new Date(event.dateTime) > new Date()
        );
        const finalEvents = upcoming.length ? upcoming : eventsData;
        setEvents(finalEvents);

        //Cache data
        await AsyncStorage.setItem(
          EVENTS_STORAGE_KEY,
          JSON.stringify(finalEvents)
        );
        const queryInfo = {
          lastFetched: new Date().toISOString(),
          total: finalEvents.length,
          source: "network",
        };
        await AsyncStorage.setItem(QUERY_CACHE_KEY, JSON.stringify(queryInfo));
        setQueryData(queryInfo);
      } catch (error) {
        console.log("Network error, loading cached events:", error);

        const cachedEvents = await AsyncStorage.getItem(EVENTS_STORAGE_KEY);
        const cachedQuery = await AsyncStorage.getItem(QUERY_CACHE_KEY);

        if (cachedEvents) setEvents(JSON.parse(cachedEvents));
        if (cachedQuery) setQueryData(JSON.parse(cachedQuery));

        if (!cachedEvents) {
          Alert.alert("Error", "No network and no cached data available.");
        }
      }
    };

    loadEvents();
  }, []);

  const handleNavigateToCreateEvent = () => {
    //navigation.navigate("CreateEvent");
    alert("Create Event: ");
  };

  const handleNavigateToEventDetails = (eventId: string) => {
    //alert("eventId: " + eventId);
    navigation.navigate("EventDetails", { eventId });
  };

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(["userInfo", "accessToken"]);
    auth?.setValue(undefined);
    navigation.navigate("Login");
  };

  return (
    <View style={styles.container}>
      {currentUser && (
        <View
          style={[
            styles.header,
            {
              paddingTop:
                Platform.OS === "android" ? StatusBar.currentHeight || 20 : 40,
            },
          ]}
        >
          <Text style={styles.welcome}>
            Welcome, {currentUser.name.first} {currentUser.name.last}!
          </Text>
          <RectButton style={styles.logoutButton} onPress={handleLogout}>
            <Feather name="log-out" size={16} color="#FFF" />
          </RectButton>
        </View>
      )}

      <MapView
        ref={mapViewRef}
        provider={PROVIDER_GOOGLE}
        initialRegion={MapSettings.DEFAULT_REGION}
        style={styles.mapStyle}
        customMapStyle={customMapStyle}
        showsMyLocationButton={false}
        showsUserLocation={true}
        rotateEnabled={false}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
        mapPadding={MapSettings.EDGE_PADDING}
        onLayout={() => {
          if (events.length) {
            mapViewRef.current?.fitToCoordinates(
              events.map((e) => e.position),
              { edgePadding: MapSettings.EDGE_PADDING }
            );
          }
        }}
      >
        {events.map((event) => (
          <Marker
            key={event.id}
            coordinate={event.position}
            onPress={() => handleNavigateToEventDetails(event.id)}
          >
            <Image
              resizeMode="contain"
              style={{ width: 48, height: 54 }}
              source={mapMarkerImg}
            />
          </Marker>
        ))}
      </MapView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{events.length} event(s) found</Text>
        <RectButton
          style={[styles.smallButton, { backgroundColor: "#00A3FF" }]}
          onPress={handleNavigateToCreateEvent}
        >
          <Feather name="plus" size={20} color="#FFF" />
        </RectButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  welcome: { fontSize: 18, fontWeight: "600" },
  logoutButton: {
    backgroundColor: "#4D6F80",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  mapStyle: { flex: 1 },
  footer: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 40,
    backgroundColor: "#FFF",
    borderRadius: 16,
    height: 56,
    paddingLeft: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 3,
  },
  footerText: { fontFamily: "Nunito_700Bold", color: "#8fa7b3" },
  smallButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});
