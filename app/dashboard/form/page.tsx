'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import VacationFormSkeleton from '@/app/ui/components/vacation-requests/VacationRequestForm/VacationFormSkeleton';

const VacationRequestForm = dynamic(
  () => import('@/app/ui/components/vacation-requests/VacationRequestForm/VacationRequestForm'),
  {
    loading: () => <VacationFormSkeleton />,
    ssr: false
  }
);

const Page = () => {
  return <VacationRequestForm />;
}

export default Page;