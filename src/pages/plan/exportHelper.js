/**
 * Export helpers for the Plan page (CSV and PDF exports).
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


const TABLE_COLUMNS = ["ID", "Name", "Beschreibung", "Start", "Ende"];


const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes('"') || str.includes(',') || str.includes(';') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};


const formatDateTime = (date) => {
    if (!date || !(date instanceof Date)) return '';
    return date.toLocaleString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};


const validateExportData = (data) => {
    if (!Array.isArray(data)) {
        return { isValid: false, error: 'Daten müssen ein Array sein' };
    }
    if (data.length === 0) {
        return { isValid: false, error: 'Keine Daten zum Exportieren vorhanden' };
    }
    return { isValid: true };
};

const transformTaskData = (data) => {
    return data.map(task => [
        task.id ?? '-',
        task.name ?? '-',
        task.text ?? '-',
        formatDateTime(task.start),
        formatDateTime(task.end)
    ]);
};

/**
 * Download an array of tasks as CSV file.
 * @param {Array} data - Task objects
 * @param {string} [fileName="ablaufplan.csv"] - Output filename
 * @param {function|null} [onError=null] - Optional error callback (message)
 */
export const downloadCSV = (data, fileName = "ablaufplan.csv", onError = null) => {
    try {
        const validation = validateExportData(data);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        const csvRows = transformTaskData(data).map(row =>
            row.map(escapeCSV).join(';')
        );

        const csvContent = "\ufeff" + [TABLE_COLUMNS.join(';'), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.click();

        URL.revokeObjectURL(url);
    } catch (error) {
        const errorMsg = `CSV-Export fehlgeschlagen: ${error.message}`;
        console.error(errorMsg);
        if (onError) onError(errorMsg);
    }
};

/**
 * Download an array of tasks as a PDF file.
 * @param {Array} data - Task objects
 * @param {string} [fileName="ablaufplan.pdf"] - Output filename
 * @param {function|null} [onError=null] - Optional error callback (message)
 */
export const downloadPDF = (data, fileName = "ablaufplan.pdf", onError = null) => {
    try {
        const validation = validateExportData(data);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        const doc = new jsPDF('l', 'mm', 'a4'); // landscape mode
        const tableRows = transformTaskData(data);


        doc.setFontSize(14);
        doc.text('Strompreis-Ablaufplan', 15, 15);
        doc.setFontSize(10);
        doc.text(`Exportiert: ${formatDateTime(new Date())}`, 15, 22);

        autoTable(doc, {
            head: [TABLE_COLUMNS],
            body: tableRows,
            startY: 30,
            theme: 'grid',
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255,
                fontStyle: 'bold'
            },
            bodyStyles: {
                textColor: 50
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            margin: { top: 30 },
            didDrawPage: (data) => {
                const pageCount = doc.internal.pages.length - 1;
                doc.setFontSize(10);
                doc.text(
                    `Seite ${data.pageNumber} von ${pageCount}`,
                    doc.internal.pageSize.getWidth() - 30,
                    doc.internal.pageSize.getHeight() - 10
                );
            }
        });

        doc.save(fileName);
    } catch (error) {
        const errorMsg = `PDF-Export fehlgeschlagen: ${error.message}`;
        console.error(errorMsg);
        if (onError) onError(errorMsg);
    }
};