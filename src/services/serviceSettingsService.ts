import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { ServiceType } from './appointmentService';

export interface ServiceSetting {
  type: ServiceType;
  price: number;
  duration: number;
  icon: string;
}

let cachedServiceSettingsMap: Record<ServiceType, ServiceSetting> | null = null;
let serviceSettingsCacheExpiresAt = 0;

const SERVICE_SETTINGS_CACHE_TTL_MS = 30 * 1000;

export const DEFAULT_SERVICE_SETTINGS: Record<ServiceType, ServiceSetting> = {
  'תספורת': { type: 'תספורת', price: 60, duration: 30, icon: 'cut' },
  'זקן': { type: 'זקן', price: 40, duration: 20, icon: 'man' },
  'תספורת + זקן': { type: 'תספורת + זקן', price: 90, duration: 50, icon: 'star' },
};

export const getServiceSettings = async (): Promise<ServiceSetting[]> => {
  const snap = await getDocs(collection(db, 'serviceSettings'));
  const merged = { ...DEFAULT_SERVICE_SETTINGS };

  snap.forEach((docSnap) => {
    const data = docSnap.data() as Partial<ServiceSetting>;
    const type = docSnap.id as ServiceType;
    if (!merged[type]) return;

    merged[type] = {
      ...merged[type],
      ...(data.type ? { type: data.type } : {}),
      ...(typeof data.price === 'number' ? { price: data.price } : {}),
      ...(typeof data.duration === 'number' ? { duration: data.duration } : {}),
      ...(typeof data.icon === 'string' ? { icon: data.icon } : {}),
    };
  });

  cachedServiceSettingsMap = merged;
  serviceSettingsCacheExpiresAt = Date.now() + SERVICE_SETTINGS_CACHE_TTL_MS;

  return Object.values(merged);
};

export const getServiceSettingsMap = async (): Promise<Record<ServiceType, ServiceSetting>> => {
  if (cachedServiceSettingsMap && Date.now() < serviceSettingsCacheExpiresAt) {
    return cachedServiceSettingsMap;
  }

  const settings = await getServiceSettings();
  return settings.reduce((accumulator, setting) => {
    accumulator[setting.type] = setting;
    return accumulator;
  }, {} as Record<ServiceType, ServiceSetting>);
};

export const updateServiceSetting = async (
  type: ServiceType,
  changes: Pick<ServiceSetting, 'price' | 'duration'>
): Promise<void> => {
  await setDoc(
    doc(db, 'serviceSettings', type),
    {
      type,
      price: changes.price,
      duration: changes.duration,
      icon: DEFAULT_SERVICE_SETTINGS[type].icon,
    },
    { merge: true }
  );

  if (cachedServiceSettingsMap) {
    cachedServiceSettingsMap = {
      ...cachedServiceSettingsMap,
      [type]: {
        ...cachedServiceSettingsMap[type],
        price: changes.price,
        duration: changes.duration,
      },
    };
    serviceSettingsCacheExpiresAt = Date.now() + SERVICE_SETTINGS_CACHE_TTL_MS;
  }
};
