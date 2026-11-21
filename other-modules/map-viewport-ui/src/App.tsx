import { MockDataProvider } from "@onedirect/data-fetcher-provider-layer";
import { MapViewport } from "./components/MapViewport.js";

const provider = new MockDataProvider();

export default function App() {
  return <MapViewport provider={provider} />;
}
