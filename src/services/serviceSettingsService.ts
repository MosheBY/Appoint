import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { ServiceType } from './appointmentService';

export interface ServiceSetting {
  type: ServiceType;
  price: number;
  duration: number;
  icon: string;
  isActive: boolean;
  isDeleted?: boolean;
}

let cachedServiceSettingsMap: Record<string, ServiceSetting> | null = null;
let serviceSettingsCacheExpiresAt = 0;

const SERVICE_SETTINGS_CACHE_TTL_MS = 30 * 1000;

export const DEFAULT_SERVICE_SETTINGS: Record<string, ServiceSetting> = {
  'תספורת': { type: 'תספורת', price: 60, duration: 30, icon: 'cut', isActive: true },
  'זקן': { type: 'זקן', price: 40, duration: 20, icon: 'man', isActive: true },
  'תספורת + זקן': { type: 'תספורת + זקן', price: 90, duration: 50, icon: 'star', isActive: true },
};

const normalizeServiceSetting = (
  serviceId: string,
  data: Partial<ServiceSetting>,
  fallback?: ServiceSetting
): ServiceSetting => ({
  type: data.type ?? fallback?.type ?? serviceId,
  price: typeof data.price === 'number' ? data.price : fallback?.price ?? 60,
  duration: typeof data.duration === 'number' ? data.duration : fallback?.duration ?? 30,
  icon: typeof data.icon === 'string' ? data.icon : fallback?.icon ?? 'cut',
  isActive: typeof data.isActive === 'boolean' ? data.isActive : fallback?.isActive ?? true,
  isDeleted: typeof data.isDeleted === 'boolean' ? data.isDeleted : fallback?.isDeleted ?? false,
});

export const getServiceSettings = async (includeInactive = false): Promise<ServiceSetting[]> => {
  const snap = await getDocs(collection(db, 'serviceSettings'));
  const merged: Record<string, ServiceSetting> = { ...DEFAULT_SERVICE_SETTINGS };

  snap.forEach((docSnap) => {
    const data = docSnap.data() as Partial<ServiceSetting>;
    merged[docSnap.id] = normalizeServiceSetting(docSnap.id, data, merged[docSnap.id]);
  });

  Object.keys(merged).forEach((serviceId) => {
    if (merged[serviceId]?.isDeleted) {
      delete merged[serviceId];
    }
  });

  cachedServiceSettingsMap = merged;
  serviceSettingsCacheExpiresAt = Date.now() + SERVICE_SETTINGS_CACHE_TTL_MS;

  const settings = Object.values(merged).sort((a, b) => a.type.localeCompare(b.type));
  return includeInactive ? settings : settings.filter((service) => service.isActive);
};

export const getServiceSettingsMap = async (): Promise<Record<string, ServiceSetting>> => {
  if (cachedServiceSettingsMap && Date.now() < serviceSettingsCacheExpiresAt) {
    return cachedServiceSettingsMap;
  }

  const settings = await getServiceSettings(true);
  return settings.reduce((accumulator, setting) => {
    accumulator[setting.type] = setting;
    return accumulator;
  }, {} as Record<string, ServiceSetting>);
};

export const updateServiceSetting = async (
  type: ServiceType,
  changes: Partial<Pick<ServiceSetting, 'price' | 'duration' | 'icon' | 'isActive' | 'isDeleted'>>
): Promise<void> => {
  const current =
    (await getServiceSettingsMap())[type] ??
    DEFAULT_SERVICE_SETTINGS[type] ??
    normalizeServiceSetting(type, { type });

  const next: ServiceSetting = {
    ...current,
    ...changes,
    type,
  };

  await setDoc(doc(db, 'serviceSettings', type), next, { merge: true });

  if (cachedServiceSettingsMap) {
    cachedServiceSettingsMap = {
      ...cachedServiceSettingsMap,
      [type]: next,
    };
    serviceSettingsCacheExpiresAt = Date.now() + SERVICE_SETTINGS_CACHE_TTL_MS;
  }
};

export const createServiceSetting = async (service: ServiceSetting): Promise<void> => {
  await setDoc(
    doc(db, 'serviceSettings', service.type),
    {
      ...service,
      isDeleted: false,
    },
    { merge: true }
  );

  if (cachedServiceSettingsMap) {
    cachedServiceSettingsMap = {
      ...cachedServiceSettingsMap,
      [service.type]: {
        ...service,
        isDeleted: false,
      },
    };
    serviceSettingsCacheExpiresAt = Date.now() + SERVICE_SETTINGS_CACHE_TTL_MS;
  }
};

export const deleteServiceSetting = async (type: ServiceType): Promise<void> => {
  const current =
    (await getServiceSettingsMap())[type] ??
    DEFAULT_SERVICE_SETTINGS[type] ??
    normalizeServiceSetting(type, { type });

  await setDoc(
    doc(db, 'serviceSettings', type),
    {
      ...current,
      type,
      isActive: false,
      isDeleted: true,
    },
    { merge: true }
  );

  if (cachedServiceSettingsMap) {
    const nextCache = { ...cachedServiceSettingsMap };
    delete nextCache[type];
    cachedServiceSettingsMap = nextCache;
    serviceSettingsCacheExpiresAt = Date.now() + SERVICE_SETTINGS_CACHE_TTL_MS;
  }
};
