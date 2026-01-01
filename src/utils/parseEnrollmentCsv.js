import Papa from 'papaparse';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

// Handmatig mapping van 3-letter maand naar nummer
const MONTHS = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

function parseBusinessDate(dateStr) {
  if (!dateStr || !dateStr.includes('-')) return null;

  const [day, mon, year] = dateStr.split('-');
  const month = MONTHS[mon.toUpperCase()];
  if (!month) return null;

  const fullYear = `20${year}`; // "25" → "2025"
  const isoString = `${fullYear}-${month}-${day}`;
  const d = dayjs(isoString, 'YYYY-MM-DD');
  return d.isValid() ? d.format('YYYY-MM-DD') : null;
}

function parseDate(value, format) {
  const parsed = dayjs(value, format);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : null;
}

export function parseEnrollmentCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      delimiter: '\t',
      skipEmptyLines: true,
      complete: (results) => {
        const cleaned = results.data
          .filter(row =>
            row['BUSINESS_DATE'] &&
            row['BUSINESS_DATE'] !== '' &&
            row['BUSINESS_DATE'] !== 'CF_LOGO'
          )
          .map((row) => {
            return {
              ...row,
              BUSINESS_DATE_ISO: parseBusinessDate(row['BUSINESS_DATE']),
              TO_CHAR_DATE_ISO: parseDate(row['TO_CHAR_PL_BUSINESS_DATE_PMS_P'], 'DD.MM.YY'),
            };
          });

        resolve(cleaned);
      },
      error: (err) => reject(err),
    });
  });
}
