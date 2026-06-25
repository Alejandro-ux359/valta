import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { getTransactions } from '../database/transactions';

export async function exportToExcel(): Promise<void> {
  const transactions = await getTransactions(1000);

  const data = transactions.map((tx) => ({
    Fecha: tx.date,
    Tipo: tx.type === 'expense' ? 'Gasto' : 'Ingreso',
    Categoría: tx.category_name ?? 'Sin categoría',
    Descripción: tx.description ?? '—',
    Monto: tx.amount,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  ws['!cols'] = [
    { wch: 12 },
    { wch: 10 },
    { wch: 16 },
    { wch: 24 },
    { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');

  // Convertir a URI de datos base64 directamente
  const wbout: string = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const dataUri = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${wbout}`;

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(dataUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Exportar reporte Excel',
      UTI: 'com.microsoft.excel.xlsx',
    });
  }
}