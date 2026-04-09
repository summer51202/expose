import Link from "next/link";

export default function PhotoNotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-5 py-10 text-center sm:px-8">
      <p className="text-sm tracking-[0.2em] text-stone-500 uppercase">Photo Not Found</p>
      <h1 className="mt-3 text-4xl font-semibold text-stone-900">找不到這張照片</h1>
      <p className="mt-4 max-w-xl leading-7 text-stone-700">
        可能是網址不正確，或這張照片已經不存在。你可以先回到首頁照片牆重新選一張。
      </p>
      <Link href="/" className="mt-6 text-stone-700 underline-offset-4 hover:underline">
        回首頁
      </Link>
    </main>
  );
}
