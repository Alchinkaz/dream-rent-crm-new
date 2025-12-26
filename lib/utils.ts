export const formatCurrency = (amount: number | string): string => {
    const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^\d.-]/g, '')) : amount;
    return new Intl.NumberFormat('ru-RU').format(num) + ' ₸';
};

export const parseCurrency = (str: string): number => {
    if (!str) return 0;
    return parseFloat(str.replace(/[^\d.-]/g, '')) || 0;
};

export const formatDateTime = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year}, ${hours}:${minutes}`;
};

export const parseDateTime = (str: string): Date => {
    if (!str) return new Date();
    try {
        const [datePart, timePart] = str.split(', ');
        const [day, month, year] = datePart.split('.').map(Number);

        let hours = 12;
        let minutes = 0;

        if (timePart) {
            const [h, m] = timePart.split(':').map(Number);
            hours = h;
            minutes = m;
        }

        return new Date(year, month - 1, day, hours, minutes);
    } catch (e) {
        return new Date();
    }
};
