                                                               

export const uniqueByRealDir = (
  locations                              ,
)                               =>
  locations.filter(
    (location, index) =>
      locations.findIndex(
        (other) => other.id === location.id && other.realDir === location.realDir,
      ) === index,
  );
