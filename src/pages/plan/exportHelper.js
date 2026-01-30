import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const downloadCSV = (data, fileName = "ablaufplan.csv") => {
    const headers = ["ID", "Name", "Beschreibung", "Start", "Ende"];

    const csvRows = data.map(task => [
        task.id,
        `"${task.name}"`,
        `"${task.text}"`,
        task.start.toLocaleString('de-DE'),
        task.end.toLocaleString('de-DE')
    ].join(';'));

    const csvContent = "\ufeff" + [headers.join(';'), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
};

export const downloadPDF = (data, fileName = "ablaufplan.pdf") => {
    const doc = new jsPDF();


    const tableColumn = ["ID", "Name", "Beschreibung", "Start", "Ende"];
    const tableRows = data.map(task => [
        task.id,
        task.name,
        task.text,
        task.start.toLocaleString('de-DE'),
        task.end.toLocaleString('de-DE')
    ]);

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(fileName);
};