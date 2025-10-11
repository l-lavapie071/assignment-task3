import React, { useContext, useState, useRef } from "react";
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
import mapMarkerGreyImg from "../images/map-marker-grey.png";
import mapMarkerBlueImg from "../images/map-marker-blue.png"; // <-- new blue marker
import { fetchEvents } from "../services/api";
import { getFromNetworkFirst } from "../services/caching";
import { useFocusEffect } from "@react-navigation/native";

const EVENTS_STORAGE_KEY = "@cached_events";

export default function EventsMap({ navigation }: any) {
  const auth = useContext(AuthenticationContext);
  const currentUser = auth?.value;
  const [events, setEvents] = useState<Event[]>([]);
  const [mapCenter, setMapCenter] = useState({
    latitude: MapSettings.DEFAULT_REGION.latitude,
    longitude: MapSettings.DEFAULT_REGION.longitude,
  });
  const mapViewRef = useRef<MapView>(null);

  useFocusEffect(
    React.useCallback(() => {
      const loadEvents = async () => {
        try {
          const data = await getFromNetworkFirst<Event[]>(
            EVENTS_STORAGE_KEY,
            fetchEvents()
          );

          const upcoming = data.filter(
            (event: Event) => new Date(event.dateTime) > new Date()
          );
          const finalEvents = upcoming.length ? upcoming : data;
          setEvents(finalEvents);
        } catch (error) {
          console.error("Failed to load events:", error);
          Alert.alert("Error", "Could not load events from network or cache.");
        }
      };
      loadEvents();
    }, [])
  );

  const handleNavigateToCreateEvent = () => {
    navigation.navigate("CreateEvent", { position: mapCenter });
  };

  const handleNavigateToEventDetails = (eventId: string) => {
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
        onRegionChangeComplete={(region) =>
          setMapCenter({
            latitude: region.latitude,
            longitude: region.longitude,
          })
        }
        onLayout={() => {
          if (events.length) {
            mapViewRef.current?.fitToCoordinates(
              events.map((e) => e.position),
              { edgePadding: MapSettings.EDGE_PADDING }
            );
          }
        }}
      >
        {events.map((event) => {
          const isFull = event.volunteersIds.length >= event.volunteersNeeded;
          const isVolunteered =
            currentUser && event.volunteersIds.includes(currentUser.id);

          let markerSource = mapMarkerImg; // default
          if (isFull) markerSource = mapMarkerGreyImg;
          if (isVolunteered) markerSource = mapMarkerBlueImg; // override if volunteered

          return (
            <Marker
              key={event.id}
              coordinate={event.position}
              onPress={() => handleNavigateToEventDetails(event.id)}
            >
              <Image
                source={markerSource}
                resizeMode="contain"
                style={{ width: 48, height: 54 }}
              />
            </Marker>
          );
        })}
      </MapView>

      {/* Fixed blue circle pointer in the center */}
      <View pointerEvents="none" style={styles.centerPointer} />

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
  centerPointer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 20,
    height: 20,
    marginLeft: -10,
    marginTop: -10,
    borderRadius: 10,
    backgroundColor: "blue",
    borderWidth: 2,
    borderColor: "white",
    zIndex: 10,
  },
});
