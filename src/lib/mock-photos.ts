export type MockPhoto = {
  id: number;
  title: string;
  location: string;
  shotAt: string;
  ratio: "portrait" | "square" | "landscape";
  color: string;
};

export const mockPhotos: MockPhoto[] = [
  {
    id: 1,
    title: "晨光街角",
    location: "Taipei",
    shotAt: "2026-02-16",
    ratio: "portrait",
    color: "from-stone-800 via-amber-700 to-orange-300",
  },
  {
    id: 2,
    title: "海風午後",
    location: "Taitung",
    shotAt: "2026-01-08",
    ratio: "landscape",
    color: "from-sky-900 via-cyan-700 to-teal-300",
  },
  {
    id: 3,
    title: "靜止月台",
    location: "Taichung",
    shotAt: "2025-12-28",
    ratio: "square",
    color: "from-zinc-900 via-slate-700 to-zinc-300",
  },
  {
    id: 4,
    title: "山霧之間",
    location: "Nantou",
    shotAt: "2025-11-02",
    ratio: "portrait",
    color: "from-emerald-950 via-lime-700 to-lime-300",
  },
  {
    id: 5,
    title: "港邊藍調",
    location: "Kaohsiung",
    shotAt: "2026-03-01",
    ratio: "landscape",
    color: "from-indigo-950 via-blue-700 to-sky-300",
  },
  {
    id: 6,
    title: "夜色人行",
    location: "Tainan",
    shotAt: "2026-02-05",
    ratio: "portrait",
    color: "from-rose-950 via-fuchsia-700 to-pink-300",
  },
];
