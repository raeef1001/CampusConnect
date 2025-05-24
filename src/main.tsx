import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ListingProvider } from './context/ListingContext.tsx';

createRoot(document.getElementById("root")!).render(
  <ListingProvider>
    <App />
  </ListingProvider>
);
