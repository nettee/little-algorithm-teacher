import { ArtifactType } from "./types";

export function getArtifactTypeRepresentation(type: ArtifactType): string {
  switch (type) {
    case ArtifactType.PROBLEM:
      return "原题";
    case ArtifactType.COURSE:
      return "课程";
    case ArtifactType.EXPLANATION:
      return "讲解";
    case ArtifactType.OTHER:
      return "其他";
  }
}