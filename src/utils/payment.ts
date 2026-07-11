export function createInvoiceCode(studentId:string,date=new Date()):string{return `HP-${studentId.toUpperCase()}-${date.getFullYear()}${String(date.getMonth()+1).padStart(2,"0")}`;}
export function createPaymentContent(invoiceCode:string):string{return invoiceCode.split("-").join(" ");}
export function buildPaymentQrPayload(input:{bankBin:string;accountNumber:string;accountName:string;amount:number;content:string}):string{return JSON.stringify({service:"VIETQR",bankBin:input.bankBin,accountNumber:input.accountNumber,accountName:input.accountName,amount:input.amount,content:input.content});}
