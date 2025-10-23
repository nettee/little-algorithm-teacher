import { createContext, useContext } from "react";

type ArtifactContextType = {
  openArtifact: (artifactId: string) => void;
};

export const ArtifactContext = createContext<ArtifactContextType>({
  openArtifact: () => {},
});

export const useArtifactContext = () => {
  return useContext(ArtifactContext);
};
