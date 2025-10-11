import axios, { AxiosResponse } from 'axios';

import { Event } from "../types/Events";
import { v4 as uuidv4 } from "uuid"; // 

const api = axios.create({
    // Before running your 'json-server', get your computer's IP address and
    // update your baseURL to `http://your_ip_address_here:3333` and then run:
    // `npx json-server --watch db.json --port 3333 --host your_ip_address_here`
    //
    // To access your server online without running json-server locally,
    // you can set your baseURL to:
    // `https://my-json-server.typicode.com/<your-github-username>/<your-github-repo>`
    //
    // To use `my-json-server`, make sure your `db.json` is located at the repo root.

    /* baseURL: 'https://my-json-server.typicode.com/l-lavapie071/assignment-task2', */
    baseURL: 'http://172.16.35.4:3333',
    //baseURL: 'http://172.16.29.201:3333',
});

export const authenticateUser = (email: string, password: string): Promise<AxiosResponse> => {
    return api.post(`/login`, { email, password });
};

// Fetch all events
export const fetchEvents = async () => {
  const response = await api.get("/events");
  return response.data;
};

// Fetch event by ID
export const fetchEvent = async (eventId: string) => {
  const response = await api.get(`/events/${eventId}`);
  return response.data;
};

// Volunteer for an event
export const volunteerForEvent = async (updatedEvent: Event) => {
  const response = await api.put(`/events/${updatedEvent.id}`, {
    ...updatedEvent, // includes all event fields
    volunteersIds: updatedEvent.volunteersIds, // updated list
  });
  return response.data;
};

// Create new event
export const createEvent = async (newEvent: Event) => {
  const response = await api.post(`/events`, newEvent);
  return response.data;
};

// Fetch  user by ID
export const fetchUser = async (userId: string) => {
  const response = await api.get(`/users/${userId}`);
  return response.data;
};