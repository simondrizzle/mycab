"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Suggestion = {
  label: string;
  postalCode: string;
  latitude: string;
  longitude: string;
};

type RideOption = {
  platform: "Grab" | "Gojek" | "TADA" | "Ryde";
  vehicleType: string;
  priceMin: number;
  priceMax: number;
  etaMin: number;
  deepLink: string;
  fallbackUrl: string;
  logoPath: string;
  erpHint: string;
};

type QueryHistoryItem = {
  id: string;
  origin: Suggestion;
  destination: Suggestion;
  distanceKm: number;
  createdAt: string;
};

type Language = "zh" | "en" | "ms";

const I18N = {
  zh: {
    appTitle: "MyCab 新加坡打车比价",
    originPlaceholder: "请输入起点邮编（6位数字）",
    destinationPlaceholder: "请输入终点邮编（6位数字）",
    postalHint: "请输入完整 6 位邮编",
    search: "查询",
    swap: "交换",
    shareWhatsapp: "分享到 WhatsApp",
    distance: "直线距离",
    eta: "预计等待时间",
    minute: "分钟",
    openPlatform: "打开",
    recent: "最近查询记录",
    selectedOrigin: "起点已选择",
    selectedDestination: "终点已选择",
    noResult: "未找到匹配地址",
    searching: "正在查询地址...",
    queryFailed: "查询失败，请稍后重试",
    needSelect: "请先在下拉列表中确认起点和终点地址",
    invalidCoords: "坐标解析失败，请重新选择地址",
    compareUpdated: "比价已更新（含高峰/平峰、最低消费、过路费与 ERP 预估）",
    swapped: "已交换起点和终点",
    historyLoaded: "已加载最近查询记录",
    shareNeedQuery: "请先完成一次查询，再分享给朋友",
    peak: "高峰时段",
    offPeak: "平峰时段",
    erpPeak: "可能产生 $3-$4 的 ERP 费用",
    erpOffPeak: "可能产生 $2-$3 的 ERP 费用",
    bestValue: "最划算",
    fourSeater: "4座车"
  },
  en: {
    appTitle: "MyCab Singapore Fare Compare",
    originPlaceholder: "Enter pickup postal code (6 digits)",
    destinationPlaceholder: "Enter drop-off postal code (6 digits)",
    postalHint: "Please enter 6 digits",
    search: "Compare",
    swap: "Swap",
    shareWhatsapp: "Share to WhatsApp",
    distance: "Distance",
    eta: "ETA",
    minute: "min",
    openPlatform: "Open",
    recent: "Recent Searches",
    selectedOrigin: "Pickup selected",
    selectedDestination: "Drop-off selected",
    noResult: "No address found",
    searching: "Searching address...",
    queryFailed: "Search failed, please try again",
    needSelect: "Please select pickup and drop-off from suggestions first",
    invalidCoords: "Coordinates are invalid, please reselect address",
    compareUpdated:
      "Comparison updated (peak/off-peak, minimum fare, toll and ERP estimate)",
    swapped: "Pickup and drop-off swapped",
    historyLoaded: "Loaded recent search",
    shareNeedQuery: "Please run one comparison before sharing",
    peak: "Peak hours",
    offPeak: "Off-peak",
    erpPeak: "ERP may add around $3-$4",
    erpOffPeak: "ERP may add around $2-$3",
    bestValue: "Best Value",
    fourSeater: "4-Seater"
  },
  ms: {
    appTitle: "MyCab Perbandingan Tambang SG",
    originPlaceholder: "Masukkan poskod pickup (6 digit)",
    destinationPlaceholder: "Masukkan poskod destinasi (6 digit)",
    postalHint: "Sila masukkan 6 digit penuh",
    search: "Cari",
    swap: "Tukar",
    shareWhatsapp: "Kongsi ke WhatsApp",
    distance: "Jarak",
    eta: "Masa tunggu",
    minute: "minit",
    openPlatform: "Buka",
    recent: "Carian Terkini",
    selectedOrigin: "Pickup dipilih",
    selectedDestination: "Destinasi dipilih",
    noResult: "Alamat tidak dijumpai",
    searching: "Mencari alamat...",
    queryFailed: "Carian gagal, cuba lagi",
    needSelect: "Sila pilih pickup dan destinasi dari senarai dahulu",
    invalidCoords: "Koordinat tidak sah, sila pilih semula",
    compareUpdated:
      "Perbandingan dikemas kini (waktu puncak, tambang minimum, tol dan ERP)",
    swapped: "Pickup dan destinasi telah ditukar",
    historyLoaded: "Carian terkini dimuatkan",
    shareNeedQuery: "Sila buat satu carian dahulu sebelum kongsi",
    peak: "Waktu puncak",
    offPeak: "Bukan puncak",
    erpPeak: "ERP mungkin tambah sekitar $3-$4",
    erpOffPeak: "ERP mungkin tambah sekitar $2-$3",
    bestValue: "Paling Berbaloi",
    fourSeater: "4-Seater"
  }
} as const;

function isPostalCode(value: string) {
  return /^\d{6}$/.test(value.trim());
}

function cleanPostalInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function getTimePricingFactor(language: Language) {
  const hour = new Date().getHours();
  if ((hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20)) {
    return { label: I18N[language].peak, multiplier: 1.25 };
  }
  return { label: I18N[language].offPeak, multiplier: 1 };
}

function getErpHint(language: Language) {
  const hour = new Date().getHours();
  if ((hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20)) {
    return I18N[language].erpPeak;
  }
  return I18N[language].erpOffPeak;
}

function buildDeepLinks(origin: Suggestion, destination: Suggestion) {
  const pickupLat = origin.latitude;
  const pickupLng = origin.longitude;
  const lat = destination.latitude;
  const lng = destination.longitude;
  const name = encodeURIComponent(destination.label);
  const pickupName = encodeURIComponent(origin.label);
  return {
    Grab: {
      deepLink: `grab://open?screenType=BOOKING&pickup_latitude=${pickupLat}&pickup_longitude=${pickupLng}&pickup_name=${pickupName}&dropoff_latitude=${lat}&dropoff_longitude=${lng}&dropoff_name=${name}`,
      fallbackUrl: "https://www.grab.com/sg/"
    },
    Gojek: {
      deepLink: `gojek://gopay/transport?pickup_lat=${pickupLat}&pickup_lng=${pickupLng}&dropoff_lat=${lat}&dropoff_lng=${lng}&dropoff_name=${name}`,
      fallbackUrl: "https://www.gojek.com/sg/"
    },
    TADA: {
      deepLink: `tada://book?pickup_lat=${pickupLat}&pickup_lng=${pickupLng}&dropoff_lat=${lat}&dropoff_lng=${lng}&dropoff_name=${name}`,
      fallbackUrl: "https://tada.global/sg/"
    },
    Ryde: {
      deepLink: `ryde://book?pickup_lat=${pickupLat}&pickup_lng=${pickupLng}&dropoff_lat=${lat}&dropoff_lng=${lng}&dropoff_name=${name}`,
      fallbackUrl: "https://www.rydesharing.com/"
    }
  };
}

function generateMockPrices(
  distanceKm: number,
  origin: Suggestion,
  destination: Suggestion,
  language: Language
): RideOption[] {
  const baseFare = 5;
  const links = buildDeepLinks(origin, destination);
  const roundedDistance = Math.max(0.5, distanceKm);
  const { label, multiplier } = getTimePricingFactor(language);
  const erpHint = getErpHint(language);
  const tollEstimate = roundedDistance > 9 ? 2 : 0;
  const minFare = 8;
  const buildRange = (perKm: number, variationMin: number, variationMax: number) => {
    const core = Math.max(
      minFare,
      (baseFare + roundedDistance * perKm + tollEstimate) * multiplier
    );
    return { priceMin: core + variationMin, priceMax: core + variationMax };
  };
  const grabRange = buildRange(1.45, 0.8, 2.8);
  const gojekRange = buildRange(1.3, 0.6, 2.4);
  const tadaRange = buildRange(1.18, 0.5, 2.1);
  const rydeRange = buildRange(1.15, 0.4, 2);

  return [
    {
      platform: "Grab",
      vehicleType: I18N[language].fourSeater,
      priceMin: grabRange.priceMin,
      priceMax: grabRange.priceMax,
      etaMin: Math.max(3, Math.round(4 + roundedDistance * 0.8)),
      deepLink: links.Grab.deepLink,
      fallbackUrl: links.Grab.fallbackUrl,
      logoPath: "/logos/grab.svg",
      erpHint: `${label}, ${erpHint}`
    },
    {
      platform: "Gojek",
      vehicleType: I18N[language].fourSeater,
      priceMin: gojekRange.priceMin,
      priceMax: gojekRange.priceMax,
      etaMin: Math.max(3, Math.round(5 + roundedDistance * 0.75)),
      deepLink: links.Gojek.deepLink,
      fallbackUrl: links.Gojek.fallbackUrl,
      logoPath: "/logos/gojek.svg",
      erpHint: `${label}, ${erpHint}`
    },
    {
      platform: "TADA",
      vehicleType: I18N[language].fourSeater,
      priceMin: tadaRange.priceMin,
      priceMax: tadaRange.priceMax,
      etaMin: Math.max(3, Math.round(6 + roundedDistance * 0.7)),
      deepLink: links.TADA.deepLink,
      fallbackUrl: links.TADA.fallbackUrl,
      logoPath: "/logos/tada.svg",
      erpHint: `${label}, ${erpHint}`
    },
    {
      platform: "Ryde",
      vehicleType: I18N[language].fourSeater,
      priceMin: rydeRange.priceMin,
      priceMax: rydeRange.priceMax,
      etaMin: Math.max(3, Math.round(6 + roundedDistance * 0.72)),
      deepLink: links.Ryde.deepLink,
      fallbackUrl: links.Ryde.fallbackUrl,
      logoPath: "/logos/ryde.svg",
      erpHint: `${label}, ${erpHint}`
    }
  ];
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("zh");
  const [originInput, setOriginInput] = useState("");
  const [destinationInput, setDestinationInput] = useState("");
  const [originLoading, setOriginLoading] = useState(false);
  const [destinationLoading, setDestinationLoading] = useState(false);
  const [originError, setOriginError] = useState("");
  const [destinationError, setDestinationError] = useState("");
  const [originSuggestions, setOriginSuggestions] = useState<Suggestion[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<Suggestion[]>(
    []
  );
  const [originSelected, setOriginSelected] = useState<Suggestion | null>(null);
  const [destinationSelected, setDestinationSelected] = useState<Suggestion | null>(
    null
  );
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [rideOptions, setRideOptions] = useState<RideOption[]>([]);
  const [queryError, setQueryError] = useState("");
  const [queryInfo, setQueryInfo] = useState("");
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const t = I18N[language];

  useEffect(() => {
    const raw = window.localStorage.getItem("recent-comparisons");
    if (!raw) return;
    try {
      setHistory((JSON.parse(raw) as QueryHistoryItem[]).slice(0, 5));
    } catch {
      window.localStorage.removeItem("recent-comparisons");
    }
  }, []);

  useEffect(() => {
    const postal = originInput.trim();
    if (!isPostalCode(postal)) {
      setOriginLoading(false);
      setOriginError("");
      setOriginSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setOriginLoading(true);
      setOriginError("");
      setOriginSuggestions([]);
      try {
        const response = await fetch(
          `/api/onemap-search?postalCode=${encodeURIComponent(postal)}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error("failed");
        const data = (await response.json()) as { results?: Suggestion[] };
        setOriginSuggestions(data.results ?? []);
      } catch (error) {
        if ((error as { name?: string }).name !== "AbortError") {
          setOriginError(t.queryFailed);
        }
      } finally {
        setOriginLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [originInput, t.queryFailed]);

  useEffect(() => {
    const postal = destinationInput.trim();
    if (!isPostalCode(postal)) {
      setDestinationLoading(false);
      setDestinationError("");
      setDestinationSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setDestinationLoading(true);
      setDestinationError("");
      setDestinationSuggestions([]);
      try {
        const response = await fetch(
          `/api/onemap-search?postalCode=${encodeURIComponent(postal)}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error("failed");
        const data = (await response.json()) as { results?: Suggestion[] };
        setDestinationSuggestions(data.results ?? []);
      } catch (error) {
        if ((error as { name?: string }).name !== "AbortError") {
          setDestinationError(t.queryFailed);
        }
      } finally {
        setDestinationLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [destinationInput, t.queryFailed]);

  const renderSuggestionList = ({
    input,
    loading,
    error,
    suggestions,
    onSelect
  }: {
    input: string;
    loading: boolean;
    error: string;
    suggestions: Suggestion[];
    onSelect: (item: Suggestion) => void;
  }) => {
    if (!isPostalCode(input)) return null;
    return (
      <div className="mt-2">
        {loading && <p className="text-sm text-slate-500">{t.searching}</p>}
        {!loading && error && <p className="text-sm text-rose-600">{error}</p>}
        {!loading && !error && suggestions.length > 0 && (
          <ul className="max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            {suggestions.map((item, index) => (
              <li key={`${item.postalCode}-${item.latitude}-${index}`}>
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className="w-full border-b border-slate-100 px-4 py-3 text-left transition last:border-0 hover:bg-slate-50"
                >
                  <p className="text-sm font-medium text-slate-800">{item.label}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.postalCode} | {item.latitude}, {item.longitude}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
        {!loading && !error && suggestions.length === 0 && (
          <p className="text-sm text-slate-500">{t.noResult}</p>
        )}
      </div>
    );
  };

  const launchWithFallback = (deepLink: string, fallbackUrl: string) => {
    let appOpened = false;
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") appOpened = true;
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.location.href = deepLink;
    setTimeout(() => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (!appOpened) window.location.href = fallbackUrl;
    }, 1200);
  };

  const saveHistory = (item: QueryHistoryItem) => {
    const next = [item, ...history].slice(0, 5);
    setHistory(next);
    window.localStorage.setItem("recent-comparisons", JSON.stringify(next));
  };

  const handleCompare = () => {
    if (!originSelected || !destinationSelected) {
      setQueryError(t.needSelect);
      setQueryInfo("");
      setRideOptions([]);
      setDistanceKm(null);
      return;
    }
    const lat1 = Number(originSelected.latitude);
    const lon1 = Number(originSelected.longitude);
    const lat2 = Number(destinationSelected.latitude);
    const lon2 = Number(destinationSelected.longitude);
    if ([lat1, lon1, lat2, lon2].some(Number.isNaN)) {
      setQueryError(t.invalidCoords);
      setQueryInfo("");
      setRideOptions([]);
      setDistanceKm(null);
      return;
    }
    const dist = calculateDistanceKm(lat1, lon1, lat2, lon2);
    const options = generateMockPrices(
      dist,
      originSelected,
      destinationSelected,
      language
    ).sort((a, b) => a.priceMin - b.priceMin);
    setDistanceKm(dist);
    setRideOptions(options);
    setQueryError("");
    setQueryInfo(t.compareUpdated);
    saveHistory({
      id: `${Date.now()}`,
      origin: originSelected,
      destination: destinationSelected,
      distanceKm: dist,
      createdAt: new Date().toLocaleString()
    });
  };

  const handleSwap = () => {
    setOriginInput(destinationInput);
    setDestinationInput(originInput);
    setOriginSelected(destinationSelected);
    setDestinationSelected(originSelected);
    setOriginSuggestions([]);
    setDestinationSuggestions([]);
    setQueryError("");
    setQueryInfo(t.swapped);
  };

  const handleLoadHistory = (item: QueryHistoryItem) => {
    setOriginInput(item.origin.postalCode);
    setDestinationInput(item.destination.postalCode);
    setOriginSelected(item.origin);
    setDestinationSelected(item.destination);
    setDistanceKm(item.distanceKm);
    setRideOptions(
      generateMockPrices(item.distanceKm, item.origin, item.destination, language).sort(
        (a, b) => a.priceMin - b.priceMin
      )
    );
    setQueryError("");
    setQueryInfo(t.historyLoaded);
  };

  const shareToWhatsApp = () => {
    if (!originSelected || !destinationSelected || !distanceKm || rideOptions.length === 0) {
      setQueryError(t.shareNeedQuery);
      return;
    }
    const lines = rideOptions
      .map(
        (item) =>
          `${item.platform}: $${item.priceMin.toFixed(2)} - $${item.priceMax.toFixed(
            2
          )}, ${t.eta} ${item.etaMin}${t.minute}`
      )
      .join("\n");
    const text =
      `${t.appTitle}\n` +
      `${t.selectedOrigin}: ${originSelected.label}\n` +
      `${t.selectedDestination}: ${destinationSelected.label}\n` +
      `${t.distance}: ${distanceKm.toFixed(2)} km\n\n` +
      lines;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12">
      <section className="mx-auto w-full max-w-xl rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Image src="/mycab-logo.svg" alt="MyCab logo" width={44} height={44} />
            <h1 className="text-lg font-bold text-slate-800 sm:text-xl">{t.appTitle}</h1>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-1">
            {(["zh", "en", "ms"] as Language[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
                  language === lang
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <input
              type="text"
              inputMode="numeric"
              placeholder={t.originPlaceholder}
              value={originInput}
              onChange={(event) => {
                setOriginInput(cleanPostalInput(event.target.value));
                setOriginSelected(null);
              }}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
            {originInput.length > 0 && originInput.length < 6 && (
              <p className="mt-1 text-xs text-amber-600">{t.postalHint}</p>
            )}
            {renderSuggestionList({
              input: originInput,
              loading: originLoading,
              error: originError,
              suggestions: originSuggestions,
              onSelect: (item) => {
                setOriginInput(item.postalCode);
                setOriginSelected(item);
                setOriginSuggestions([]);
              }
            })}
          </div>

          <div>
            <input
              type="text"
              inputMode="numeric"
              placeholder={t.destinationPlaceholder}
              value={destinationInput}
              onChange={(event) => {
                setDestinationInput(cleanPostalInput(event.target.value));
                setDestinationSelected(null);
              }}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
            {destinationInput.length > 0 && destinationInput.length < 6 && (
              <p className="mt-1 text-xs text-amber-600">{t.postalHint}</p>
            )}
            {renderSuggestionList({
              input: destinationInput,
              loading: destinationLoading,
              error: destinationError,
              suggestions: destinationSuggestions,
              onSelect: (item) => {
                setDestinationInput(item.postalCode);
                setDestinationSelected(item);
                setDestinationSuggestions([]);
              }
            })}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleCompare}
              className="col-span-2 rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white transition hover:bg-indigo-700 active:scale-[0.99]"
            >
              {t.search}
            </button>
            <button
              type="button"
              onClick={handleSwap}
              className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {t.swap}
            </button>
          </div>

          {queryError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {queryError}
            </div>
          )}
          {queryInfo && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {queryInfo}
            </div>
          )}

          {(originSelected || destinationSelected) && (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              {originSelected && (
                <p>
                  {t.selectedOrigin}: {originSelected.label} ({originSelected.latitude},{" "}
                  {originSelected.longitude})
                </p>
              )}
              {destinationSelected && (
                <p className={originSelected ? "mt-2" : ""}>
                  {t.selectedDestination}: {destinationSelected.label} (
                  {destinationSelected.latitude}, {destinationSelected.longitude})
                </p>
              )}
            </div>
          )}

          {distanceKm !== null && rideOptions.length > 0 && (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                {t.distance}:{" "}
                <span className="font-semibold text-slate-900">{distanceKm.toFixed(2)} km</span>
              </div>

              {rideOptions.map((option, index) => (
                <article
                  key={option.platform}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-transform duration-300 hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <Image
                          src={option.logoPath}
                          alt={`${option.platform} logo`}
                          width={44}
                          height={44}
                        />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-slate-900">{option.platform}</p>
                        <p className="text-sm text-slate-500">{option.vehicleType}</p>
                        {index === 0 && (
                          <span className="mt-1 inline-block rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            {t.bestValue}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-lg font-bold text-slate-900">
                      ${option.priceMin.toFixed(2)} - ${option.priceMax.toFixed(2)}
                    </p>
                  </div>

                  <p className="mt-2 text-xs text-slate-500">{option.erpHint}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-sm text-slate-600">
                      {t.eta}: {option.etaMin} {t.minute}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        launchWithFallback(option.deepLink, option.fallbackUrl)
                      }
                      className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                    >
                      {t.openPlatform} {option.platform}
                    </button>
                  </div>
                </article>
              ))}

              <button
                type="button"
                onClick={shareToWhatsApp}
                className="w-full rounded-xl border border-emerald-500 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                {t.shareWhatsapp}
              </button>
            </div>
          )}

          {history.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-800">{t.recent}</p>
              <div className="mt-3 space-y-2">
                {history.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleLoadHistory(item)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm transition hover:bg-slate-50"
                  >
                    <p className="font-medium text-slate-800">
                      {item.origin.postalCode} -&gt; {item.destination.postalCode}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {t.distance} {item.distanceKm.toFixed(2)} km | {item.createdAt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
