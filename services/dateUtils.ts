export const formatLocalDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '--';
    // Use regex to split instead of simple split to be safer
    const parts = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!parts) return dateStr;

    const [_, year, month, day] = parts;
    return `${day}/${month}/${year}`;
};

export const getTodayLocalDate = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
