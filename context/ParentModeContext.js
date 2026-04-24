"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";

const ParentModeContext = createContext();

export function ParentModeProvider({ children }) {
  const { data: session } = useSession();
  const [isParentMode, setIsParentMode] = useState(false);
  const [parentPin, setParentPin] = useState(null); // Store hashed PIN or fetch from API

  // In a real app, we would verify the PIN against the backend API
  // For now, we'll assume the PIN is verified by the Toggle component before setting state

  const toggleParentMode = (status) => {
    setIsParentMode(status);
  };

  return (
    <ParentModeContext.Provider value={{ isParentMode, toggleParentMode }}>
      {children}
    </ParentModeContext.Provider>
  );
}

export function useParentMode() {
  return useContext(ParentModeContext);
}
