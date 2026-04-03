// export const isBeforeNow = (d: any) => {
//     const timeStamp = getKolkataTimestamp()
//     const now = toDate(timeStamp) ?? new Date()
//     const dd = toDate(d)
//     return dd ? dd < now : false
// }

// export const isAfterNow = (d: any) => {
//     const timeStamp = getKolkataTimestamp()
//     const now = toDate(timeStamp) ?? new Date()
//     const dd = toDate(d)
//     return dd ? dd > now : false
// }


export function getKolkataDateTime() {
    return new Date()
}
