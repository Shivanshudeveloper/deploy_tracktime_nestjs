class RecordOfWeek {
    Date: string;
    DateStatus: string;
  }
  
  export class AttendanceDto {
    device_id: string;
    user_name: string;
    user_id: string;
    totalworkdays: number = 7;
    holiday: number = 2;
    recordsofWeek: RecordOfWeek[] = [];
  }
  