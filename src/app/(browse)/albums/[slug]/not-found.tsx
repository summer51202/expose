import Link from "next/link";

export default function AlbumNotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-5 py-10 text-center sm:px-8">
      <p className="text-sm tracking-[0.2em] text-stone-500 uppercase">Album Not Found</p>
      <h1 className="mt-3 text-4xl font-semibold text-stone-900">找不到這本相簿</h1>
      <p className="mt-4 max-w-xl leading-7 text-stone-700">
        可能是網址不正確，或這本相簿尚未建立。你可以先回首頁重新選擇。
      </p>
      <Link href="/" className="mt-6 text-stone-700 underline-offset-4 hover:underline">
        回首頁
      </Link>
    </main>
  );
}
