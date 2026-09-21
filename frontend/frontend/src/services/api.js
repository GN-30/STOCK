import axios from "axios";

const rawUrl = import.meta.env.VITE_API_URL || "";
const baseURL = rawUrl ? rawUrl.replace(/\/+$/, "") : "";

const API = axios.create({
    baseURL: baseURL || undefined
});

export default API;