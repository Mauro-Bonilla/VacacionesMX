import {Lusitana,Montserrat} from 'next/font/google';

export const monserrat = Montserrat({subsets:['latin'], weight:'500'});

export const lusitana = Lusitana({
    subsets:['latin'], 
    weight:['400','700']
});