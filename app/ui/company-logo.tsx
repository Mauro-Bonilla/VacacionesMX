import { lusitana } from "@/app/ui/fonts";
import Image from "next/image";

export default function CompanyLogo() {
  return (
    <div
      className={`${lusitana.className} flex flex-row items-center justify-center leading-none text-primary-500`}
    >
      <div className="relative">
        <Image
          src="/logo-generic.svg"
          width={120}
          height={50}
          className="w-[216px] md:w-[240px] h-auto" 
          alt="Company Logo"
          priority
        />
      </div>
    </div>
  );
}
