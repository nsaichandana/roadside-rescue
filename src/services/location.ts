export type UserLocation = {
    latitude: number;
    longitude: number;
  };
  
  export async function getUserLocation(): Promise<UserLocation> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(
          new Error(
            "Geolocation is not supported on this device."
          )
        );
  
        return;
      }
  
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude:
              position.coords.latitude,
  
            longitude:
              position.coords.longitude,
          });
        },
  
        (error) => {
          reject(
            new Error(
              error.message ||
                "Unable to fetch location."
            )
          );
        },
  
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }