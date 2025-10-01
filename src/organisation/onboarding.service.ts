import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Organization } from './organisation.entity';
import { DesktopApplication } from './desktop.entity';
import { Team } from './team.entity';
import { Between, IsNull, Not, Repository } from 'typeorm';
import { TrackTimeStatus, User } from 'src/users/user.entity';
import { CreateTeamDTO } from './dto/teams.dto';
import { UserActivity } from 'src/users/user_activity.entity';
import { DeepPartial } from 'typeorm';
import { prototype } from 'events';
import { ConfigService } from '@nestjs/config';
import { AccessAnalyzer, S3 } from 'aws-sdk';
import { Devices } from './devices.entity';
import { validate } from 'class-validator';
import { Subscription } from './subscription.entity';
import axios from 'axios';
import { CalculatedLogic } from './calculatedLogic.entity';
import { AttendanceDto } from './dto/attendance.dto';
import { CreateCalculatedLogicDto } from './dto/calculatedLogic.dto';
import { CreateOrganizationDTO } from './dto/organization.dto';
import { Policy } from './trackingpolicy.entity';
import { TrackingPolicyDTO } from './dto/tracingpolicy.dto';
import { PolicyTeams } from './policy_team.entity';
import { PolicyUsers } from './policy_user.entity';
import { ScreenshotSettings } from './screenshot_settings.entity';
import { TrackingHolidays } from './tracking_holidays.entity';
import { TrackingWeekdays } from './tracking_weekdays.entity';
import { ConfigurationServicePlaceholders } from 'aws-sdk/lib/config_service_placeholders';
import { organizationAdminService } from './OrganizationAdmin.service';
import { ProductivitySettingEntity } from './prodsetting.entity';
import { Resend } from 'resend';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';
import { createObjectCsvWriter } from 'csv-writer';
import * as fs from 'fs';
import * as path from 'path';

export const holidayList = [
  // Indian Holidays
  { dayName: 'Republic Day', date: new Date('2024-01-26') },
  { dayName: 'Independence Day', date: new Date('2024-08-15') },
  { dayName: 'Gandhi Jayanti', date: new Date('2024-10-02') },
  { dayName: 'Holi', date: new Date('2024-03-25') },
  { dayName: 'Diwali', date: new Date('2024-11-12') },
  { dayName: 'Eid al-Fitr', date: new Date('2024-04-10') },
  { dayName: 'Christmas', date: new Date('2024-12-25') },
  { dayName: 'Good Friday', date: new Date('2024-03-29') },
  { dayName: 'Dussehra', date: new Date('2024-10-15') },
  { dayName: 'Janmashtami', date: new Date('2024-08-22') },
  { dayName: 'Mahatma Gandhi Jayanti', date: new Date('2024-10-02') },

  // Global Holidays
  { dayName: "New Year's Day", date: new Date('2024-01-01') },
  { dayName: "International Women's Day", date: new Date('2024-03-08') },
  { dayName: 'Labor Day', date: new Date('2024-05-01') },
  { dayName: 'Halloween', date: new Date('2024-10-31') },
  { dayName: 'Thanksgiving', date: new Date('2024-11-28') },
  { dayName: 'Veterans Day', date: new Date('2024-11-11') },
  { dayName: 'Easter Sunday', date: new Date('2024-03-31') },
  { dayName: "Mother's Day", date: new Date('2024-05-12') },
  { dayName: "Father's Day", date: new Date('2024-06-16') },
  { dayName: "Valentine's Day", date: new Date('2024-02-14') },
];
const weekdayData = [
  {
    day_uuid: '1c7421c2-26f7-11ec-9621-0242ac130002',
    day_name: 'Monday',
    day_status: true,
    checkIn: 930,
    checkOut: 1800,
    break_start: 1330,
    break_end: 1430,
  },
  {
    day_uuid: '1c7421c2-26f7-11ec-9621-0242ac130003',
    day_name: 'Tuesday',
    day_status: true,
    checkIn: 930,
    checkOut: 1800,
    break_start: 1330,
    break_end: 1430,
  },
  {
    day_uuid: '1c7421c2-26f7-11ec-9621-0242ac130004',
    day_name: 'Wednesday',
    day_status: true,
    checkIn: 930,
    checkOut: 1800,
    break_start: 1330,
    break_end: 1430,
  },
  {
    day_uuid: '1c7421c2-26f7-11ec-9621-0242ac130005',
    day_name: 'Thursday',
    day_status: true,
    checkIn: 930,
    checkOut: 1800,
    break_start: 1330,
    break_end: 1430,
  },
  {
    day_uuid: '1c7421c2-26f7-11ec-9621-0242ac130006',
    day_name: 'Friday',
    day_status: true,
    checkIn: 930,
    checkOut: 1800,
    break_start: 1330,
    break_end: 1430,
  },
  {
    day_uuid: '1c7421c2-26f7-11ec-9621-0242ac130007',
    day_name: 'Saturday',
    day_status: true,
    checkIn: 1000,
    checkOut: 1600,
    break_start: 1330,
    break_end: 1430,
  },
  {
    day_uuid: '1c7421c2-26f7-11ec-9621-0242ac130008',
    day_name: 'Sunday',
    day_status: false,
    checkIn: 930,
    checkOut: 1800,
    break_start: 1330,
    break_end: 1430,
  },
];

// You can then save this `weekdayData` into the database using your existing repository methods.

export let DeployFlaskBaseApi = 'https://python-url-classification-xpdt.onrender.com'; 
export let LocalFlaskBaseApi = 'http://127.0.0.1:5000';
// DeployFlaskBaseApi=LocalFlaskBaseApi;
type UpdateConfigType = DeepPartial<User['config']>;

@Injectable()
export class OnboardingService {
  private s3: S3;
  // private flaskApiUrl = `${LocalFlaskBaseApi}/calculate_hourly_productivity?date=2024-06-28`; // Flask API URL
  // private flaskApiUrl = `${LocalFlaskBaseApi}/calculate_hourly_productivity?date=2024-07-14`; // Flask API URL
  private flaskBaseApiUrl = `${DeployFlaskBaseApi}/calculate_hourly_productivity`;
  private readonly logger = new Logger(OnboardingService.name);
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(Policy)
    private policyRepository: Repository<Policy>,
    @InjectRepository(DesktopApplication)
    private desktopAppRepository: Repository<DesktopApplication>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserActivity)
    private userActivityRepository: Repository<UserActivity>,
    @InjectRepository(Devices)
    private devicesRepository: Repository<Devices>,
    private ConfigureService: ConfigService,
    @InjectRepository(Subscription)
    private SubscriptionRepository: Repository<Subscription>,
    @InjectRepository(PolicyUsers)
    private PolicyUserRepository: Repository<PolicyUsers>,
    @InjectRepository(PolicyTeams)
    private PolicyTeamRepository: Repository<PolicyTeams>,
    @InjectRepository(ScreenshotSettings)
    private ScreenshotSetRepository: Repository<ScreenshotSettings>,
    @InjectRepository(TrackingHolidays)
    private TrackHolidaysRepository: Repository<TrackingHolidays>,
    @InjectRepository(TrackingWeekdays)
    private TrackWeedaysRepository: Repository<TrackingWeekdays>,
    @InjectRepository(ProductivitySettingEntity)
    private TrackProdSettingsRepository: Repository<ProductivitySettingEntity>,
    @InjectRepository(CalculatedLogic)
    private calculatedLogicRepository: Repository<CalculatedLogic>,
  ) {
    this.s3 = new S3({
      endpoint: this.ConfigureService.get<string>('WASABI_ENDPOINT'),
      accessKeyId: this.ConfigureService.get<string>('WASABI_ACCESS_KEY_ID'),
      secretAccessKey: this.ConfigureService.get<string>(
        'WASABI_SECRET_ACCESS_KEY',
      ),
      region: this.ConfigureService.get<string>('WASABI_REGION'),
    });
  }
  async getOrganizationDetails(id: string): Promise<Organization> {
    console.log('id', id);
    if (id) {
      let organization = await this.organizationRepository.findOne({
        where: { id },
      });
      console.log('organization', organization);
      return organization;
    }
    return null;
  }

  async createCalculatedLogicForNewOrganization(
    organizationId: string,
  ): Promise<boolean> {
    if (!organizationId) {
      return false;
    }
    const calculatedLogic = this.calculatedLogicRepository.create({
      organization_id: organizationId,
      full_day_active_time: 8,
      full_day_core_productive_time: 4,
      full_day_productive_time: 2,
      full_day_idle_productive_time: 2,
      half_day_active_time: 4,
      half_day_core_productive_time: 2,
      half_day_productive_time: 1,
      half_day_idle_productive_time: 1,
      timesheet_calculation_logic: 'coreProductivePlusProductive', // Add this line
    });
    await this.calculatedLogicRepository.save(calculatedLogic);

    return true;
  }

  async createCalculatedLogic(
    data: Partial<CreateCalculatedLogicDto>,
    organizationId: string,
  ): Promise<CalculatedLogic> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    console.log('organization', organization);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const isExistCalculatedLogic = await this.calculatedLogicRepository.findOne(
      { where: { organization_id: organizationId } },
    );
    console.log('isExistCalculatedLogic', isExistCalculatedLogic);

    if (!isExistCalculatedLogic?.id) {
      console.log('data', data);
      const calculatedLogic = this.calculatedLogicRepository.create({
        organization_id: organization?.id,
        full_day_active_time: data.fullDayActiveTime,
        full_day_core_productive_time: data.fullDayCoreProductiveTime,
        full_day_productive_time: data.fullDayProductiveTime,
        full_day_idle_productive_time: data.fullDayIdleTime,
        half_day_active_time: data.halfDayActiveTime,
        half_day_core_productive_time: data.halfDayCoreProductiveTime,
        half_day_productive_time: data.halfDayProductiveTime,
        half_day_idle_productive_time: data.halfDayIdleTime,
        timesheet_calculation_logic:
          data.timesheetCalculationLogic || 'coreProductivePlusProductive', // Add this line
      });
      return this.calculatedLogicRepository.save(calculatedLogic);
    }

    console.log(data);
    // Update existing record
    isExistCalculatedLogic.full_day_active_time = data.fullDayActiveTime;
    isExistCalculatedLogic.full_day_core_productive_time =
      data.fullDayCoreProductiveTime;
    isExistCalculatedLogic.full_day_productive_time =
      data.fullDayProductiveTime;
    isExistCalculatedLogic.full_day_idle_productive_time = data.fullDayIdleTime;
    isExistCalculatedLogic.half_day_active_time = data.halfDayActiveTime;
    isExistCalculatedLogic.half_day_core_productive_time =
      data.halfDayCoreProductiveTime;
    isExistCalculatedLogic.half_day_productive_time =
      data.halfDayProductiveTime;
    isExistCalculatedLogic.half_day_idle_productive_time = data.halfDayIdleTime;
    isExistCalculatedLogic.timesheet_calculation_logic =
      data.timesheetCalculationLogic ||
      isExistCalculatedLogic.timesheet_calculation_logic; // Add this line

    return this.calculatedLogicRepository.save(isExistCalculatedLogic);
  }

  async sendTeamInviteEmail(
    email: string,
    teamId: string,
    organizationId: string,
    inviteUrl: string,
  ): Promise<boolean> {
    try {
      // Validate API key
      if (!process.env.RESEND_API_KEY) {
        throw new Error('Missing RESEND_API_KEY');
      }

      const resend = new Resend(process.env.RESEND_API_KEY);

      // Fetch organization and team info
      const organization = await this.organizationRepository.findOne({
        where: { id: organizationId },
      });
      const team = await this.teamRepository.findOne({ where: { id: teamId } });

      if (!organization || !team) {
        throw new Error('Organization or team not found');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email address format');
      }

      // Sanitize organization name for display
      const sanitizedOrgName =
        organization.name
          .replace(/[<>@]/g, '')
          .replace(/[^\w\s.-]/g, '')
          .trim() || 'TrackTime';

      // HTML Email
      const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Welcome to ${sanitizedOrgName}!</h2>
        <p>You've been invited to join the team: <strong>${team.name}</strong></p>
        <p style="margin-top: 20px;">
          <a href="${inviteUrl}" target="_blank" style="
            display: inline-block;
            background-color: #4CAF50;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 4px;
          ">Accept Your Invitation</a>
        </p>
        <p style="margin-top: 30px;">Best regards,<br/>${sanitizedOrgName} Team</p>
      </div>
    `;

      // Plain-text fallback
      const emailText = `
Welcome to ${sanitizedOrgName}!

You've been invited to join the team: ${team.name}

Accept your invitation by visiting this link: ${inviteUrl}

Best regards,
${sanitizedOrgName} Team
    `;

      // Send the email
      const data = await resend.emails.send({
        from: `${sanitizedOrgName} <tracktime@syncsfer.com>`, // Make sure this is a verified sender
        to: email, // Use string, not array
        subject: `You're invited to join ${team.name} at ${sanitizedOrgName}`,
        html: emailHtml,
        text: emailText,
      });

      console.log('✅ Email sent successfully:', data);
      return true;
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      return false;
    }
  }
  async findUnassignedDevices(organizationId: string): Promise<Devices[]> {
    try {
      const unassignedDevices = await this.devicesRepository.find({
        where: {
          organization_uid: organizationId,
          user_uid: IsNull(), // Devices that are not assigned to any user
        },
      });
      return unassignedDevices;
    } catch (error) {
      console.error('Error finding unassigned devices:', error);
      throw new Error('Failed to fetch unassigned devices');
    }
  }

  async generateExport(
    data: any[],
    format: 'csv' | 'excel' | 'pdf' | 'txt',
    date: string,
  ): Promise<Buffer | string> {
    console.log(
      `Generating export in ${format} format for ${data.length} records`,
    );

    try {
      switch (format) {
        case 'csv':
          return this.generateCSV(data, date);
        case 'excel':
          return this.generateExcel(data, date);
        case 'pdf':
          return this.generatePDF(data, date);
        case 'txt':
          return this.generateText(data, date);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error(`Error generating ${format} export:`, error);
      throw new Error(`Failed to generate ${format} export: ${error.message}`);
    }
  }

  private async generateCSV(data: any[], date: string): Promise<string> {
    const headers = [
      { id: 'name', title: 'Employee Name' },
      { id: 'inTime', title: 'In Time' },
      { id: 'outTime', title: 'Out Time' },
      { id: 'workHour', title: 'Work Hours' },
      { id: 'date', title: 'Date' },
    ];

    const records = data.map((item) => ({
      name: item.name || 'N/A',
      inTime: item.InTime || '00:00',
      outTime: item.OutTime || '00:00',
      workHour: item.WorkHour || '00:00',
      date: this.formatDate(date),
    }));

    // Create CSV content manually since csv-writer requires file system
    let csvContent = headers.map((h) => h.title).join(',') + '\n';

    records.forEach((record) => {
      const row = [
        `"${record.name}"`,
        `"${record.inTime}"`,
        `"${record.outTime}"`,
        `"${record.workHour}"`,
        `"${record.date}"`,
      ].join(',');
      csvContent += row + '\n';
    });

    return csvContent;
  }

  private async generateExcel(data: any[], date: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Timesheet Data');

    // Add title
    worksheet.mergeCells('A1:E1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `Timesheet Report - ${this.formatDate(date)}`;
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center' };

    // Add headers
    const headers = [
      'Employee Name',
      'In Time',
      'Out Time',
      'Work Hours',
      'Date',
    ];
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Add data rows
    data.forEach((item) => {
      const row = worksheet.addRow([
        item.name || 'N/A',
        item.InTime || '00:00',
        item.OutTime || '00:00',
        item.WorkHour || '00:00',
        this.formatDate(date),
      ]);

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      column.width = 15;
    });

    // Generate buffer
    return (await workbook.xlsx.writeBuffer()) as Buffer;
  }

  private async generatePDF(data: any[], date: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Add title
        doc
          .fontSize(20)
          .font('Helvetica-Bold')
          .text(`Timesheet Report`, 50, 50);
        doc
          .fontSize(14)
          .font('Helvetica')
          .text(`Date: ${this.formatDate(date)}`, 50, 80);

        // Add table headers
        const startY = 120;
        const headers = [
          'Employee Name',
          'In Time',
          'Out Time',
          'Work Hours',
          'Date',
        ];
        const columnWidths = [150, 80, 80, 80, 100];
        let currentY = startY;

        // Draw header row
        doc.fontSize(12).font('Helvetica-Bold');
        let currentX = 50;
        headers.forEach((header, index) => {
          doc.rect(currentX, currentY, columnWidths[index], 25).stroke();
          doc.text(header, currentX + 5, currentY + 7, {
            width: columnWidths[index] - 10,
            align: 'left',
          });
          currentX += columnWidths[index];
        });

        currentY += 25;

        // Draw data rows
        doc.font('Helvetica');
        data.forEach((item) => {
          currentX = 50;
          const rowData = [
            item.name || 'N/A',
            item.InTime || '00:00',
            item.OutTime || '00:00',
            item.WorkHour || '00:00',
            this.formatDate(date),
          ];

          rowData.forEach((cellData, index) => {
            doc.rect(currentX, currentY, columnWidths[index], 25).stroke();
            doc.text(String(cellData), currentX + 5, currentY + 7, {
              width: columnWidths[index] - 10,
              align: 'left',
            });
            currentX += columnWidths[index];
          });

          currentY += 25;

          // Add new page if needed
          if (currentY > 700) {
            doc.addPage();
            currentY = 50;
          }
        });

        // Add summary
        currentY += 20;
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text(`Total Employees: ${data.length}`, 50, currentY);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
  async getAttendanceExportData(
    organizationId: string,
    startDate: string,
    endDate: string,
    users: string[] | 'all',
    userData?: any[],
  ): Promise<any[]> {
    try {
      const fromDate = new Date(startDate);
      const toDate = new Date(endDate);

      // Get attendance data using existing method
      const attendanceData = await this.getWeeklyAttendance(
        organizationId,
        fromDate,
        toDate,
      );

      if (!attendanceData || attendanceData.length === 0) {
        return [];
      }

      // Filter data based on selected users
      let filteredData = attendanceData;

      if (users !== 'all' && Array.isArray(users) && users.length > 0) {
        filteredData = attendanceData.filter(
          (record) =>
            users.includes(record.device_id) || users.includes(record.user_id),
        );
      }

      // Transform data for export format
      const exportData = filteredData.map((record) => {
        const baseData = {
          name: record.user_name || 'Unknown',
          totalWorkDays: record.totalworkdays || 0,
          holidays: record.holiday || 0,
          device_id: record.device_id,
          user_id: record.user_id,
        };

        // Add individual date columns
        if (record.recordsofWeek && record.recordsofWeek.length > 0) {
          record.recordsofWeek.forEach((dayRecord, index) => {
            const dateKey = `date_${index + 1}`;
            const statusKey = `status_${index + 1}`;

            baseData[dateKey] = dayRecord.Date || '';
            baseData[statusKey] = this.getStatusDisplayText(
              dayRecord.DateStatus,
            );
          });
        }

        return baseData;
      });

      return exportData;
    } catch (error) {
      console.error('Error getting attendance export data:', error);
      throw new Error(`Failed to get attendance export data: ${error.message}`);
    }
  }

  async generateAttendanceExport(
    data: any[],
    format: 'csv' | 'excel' | 'pdf' | 'txt',
    startDate: string,
    endDate: string,
  ): Promise<Buffer | string> {
    console.log(
      `Generating attendance export in ${format} format for ${data.length} records`,
    );

    try {
      switch (format) {
        case 'csv':
          return this.generateAttendanceCSV(data, startDate, endDate);
        case 'excel':
          return this.generateAttendanceExcel(data, startDate, endDate);
        case 'pdf':
          return this.generateAttendancePDF(data, startDate, endDate);
        case 'txt':
          return this.generateAttendanceText(data, startDate, endDate);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error(`Error generating ${format} attendance export:`, error);
      throw new Error(
        `Failed to generate ${format} attendance export: ${error.message}`,
      );
    }
  }
// Add these methods to your OnboardingService class

async getActivityTimelineExportData(
  organizationId: string,
  date: string,
  users: string[] | 'all',
  userData?: any[],
): Promise<any[]> {
  try {
    // Get productivity data from Flask API for the specific date
    const productivityData = await this.getProductivityData(organizationId, date);

    if (!productivityData || productivityData.length === 0) {
      return [];
    }

    // Filter data based on selected users
    let filteredData = productivityData;

    if (users !== 'all' && Array.isArray(users) && users.length > 0) {
      // If users array contains indices, filter by those indices
      if (userData && userData.length > 0) {
        filteredData = users.map(userIndex => {
          const index = parseInt(userIndex.toString());
          return productivityData[index];
        }).filter(Boolean);
      } else {
        // Filter by user names or IDs
        filteredData = productivityData.filter((record, index) => 
          users.includes(index.toString()) || 
          users.includes(record.name) ||
          users.includes(record.user_id)
        );
      }
    }

    // Transform data for export format
    const exportData = filteredData.map((record) => {
      const baseData = {
        name: record.name || 'Unknown',
        workingHour: record.workingHour || '0:00',
        date: this.formatDate(date),
        user_id: record.user_id || null,
      };

      // Process productivity timeline (9 AM to 6 PM = 9 hours)
      if (record.productivityRecord && record.productivityRecord.length > 0) {
        const timeline = [];
        
        // Process first 9 hours (9 AM to 6 PM)
        record.productivityRecord.slice(0, 9).forEach((hour, hourIndex) => {
          const hourTime = 9 + hourIndex; // 9 AM, 10 AM, etc.
          
          // Each hour has 6 ten-minute segments
          for (let segmentIndex = 0; segmentIndex < 6; segmentIndex++) {
            const segment = hour[segmentIndex] || {};
            const startMinute = segmentIndex * 10;
            const endMinute = startMinute + 10;
            
            const timeSlot = `${hourTime.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}-${hourTime.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
            
            // Determine productivity status with proper fallback
            let productivity = 'away';
            if (segment && segment.productivity && parseFloat(segment.percent || '0') > 0) {
              productivity = segment.productivity.toLowerCase();
            }
            
            timeline.push({
              timeSlot,
              productivity: productivity,
              percent: segment.percent || '0',
            });
          }
        });
        
        baseData['timeline'] = timeline;
      } else {
        // If no timeline data, fill with 'away' status
        const timeline = [];
        for (let hour = 9; hour <= 17; hour++) {
          for (let segment = 0; segment < 6; segment++) {
            const startMinute = segment * 10;
            const endMinute = startMinute + 10;
            const timeSlot = `${hour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}-${hour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
            timeline.push({
              timeSlot,
              productivity: 'away',
              percent: '0',
            });
          }
        }
        baseData['timeline'] = timeline;
      }

      return baseData;
    });

    return exportData;
  } catch (error) {
    console.error('Error getting activity timeline export data:', error);
    throw new Error(`Failed to get activity timeline export data: ${error.message}`);
  }
}

async generateActivityTimelineExport(
  data: any[],
  format: 'csv' | 'excel' | 'pdf' | 'txt',
  date: string,
): Promise<Buffer | string> {
  console.log(
    `Generating activity timeline export in ${format} format for ${data.length} records`,
  );

  try {
    switch (format) {
      case 'csv':
        return this.generateActivityTimelineCSV(data, date);
      case 'excel':
        return this.generateActivityTimelineExcel(data, date);
      case 'pdf':
        return this.generateActivityTimelinePDF(data, date);
      case 'txt':
        return this.generateActivityTimelineText(data, date);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  } catch (error) {
    console.error(`Error generating ${format} activity timeline export:`, error);
    throw new Error(
      `Failed to generate ${format} activity timeline export: ${error.message}`,
    );
  }
}

private async generateActivityTimelineCSV(data: any[], date: string): Promise<string> {
  const formattedDate = this.formatDate(date);
  
  // Create header with time slots
  const timeSlots = [];
  for (let hour = 9; hour <= 17; hour++) {
    for (let segment = 0; segment < 6; segment++) {
      const startMinute = segment * 10;
      const endMinute = startMinute + 10;
      timeSlots.push(`${hour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}-${hour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`);
    }
  }

  const headers = ['Employee Name', 'Work Hours', 'Date', ...timeSlots];
  let csvContent = headers.join(',') + '\n';

  data.forEach((item) => {
    const row = [
      `"${item.name || 'N/A'}"`,
      `"${item.workingHour || '0:00'}"`,
      `"${formattedDate}"`,
    ];

    // Add productivity data for each time slot
    if (item.timeline && item.timeline.length > 0) {
      item.timeline.forEach(segment => {
        row.push(`"${this.getProductivityDisplayText(segment.productivity)}"`);
      });
    } else {
      // Fill with 'Away' if no data
      timeSlots.forEach(() => row.push('"Away"'));
    }

    csvContent += row.join(',') + '\n';
  });

  // Add summary
  csvContent += '\n';
  csvContent += '"SUMMARY:"\n';
  csvContent += `"Total Employees","${data.length}"\n`;
  csvContent += `"Report Date","${formattedDate}"\n`;
  csvContent += '"NOTE: Timeline shows productivity status in 10-minute intervals from 9:00 AM to 6:00 PM"\n';

  return csvContent;
}

private async generateActivityTimelineExcel(data: any[], date: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Activity Timeline');

  const formattedDate = this.formatDate(date);

  // Add title
  worksheet.mergeCells('A1:BC1'); // Extended to cover all columns (54 time slots + 3 info columns)
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `Activity Timeline Report - ${formattedDate}`;
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: 'center' };

  // Create time slot headers
  const timeSlots = [];
  for (let hour = 9; hour <= 17; hour++) {
    for (let segment = 0; segment < 6; segment++) {
      const startMinute = segment * 10;
      const endMinute = startMinute + 10;
      timeSlots.push(`${hour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}-${hour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`);
    }
  }

  // Add headers
  const headers = ['Employee Name', 'Work Hours', 'Date', ...timeSlots];
  const headerRow = worksheet.addRow(headers);

  headerRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, size: 8 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
    cell.alignment = { horizontal: 'center', wrapText: true };
  });

  // Add data rows
  data.forEach((item) => {
    const rowData = [
      item.name || 'N/A',
      item.workingHour || '0:00',
      formattedDate,
    ];

    // Add productivity data for each time slot
    if (item.timeline && item.timeline.length > 0) {
      item.timeline.forEach(segment => {
        rowData.push(this.getProductivityDisplayText(segment.productivity));
      });
    } else {
      // Fill with 'Away' if no data
      timeSlots.forEach(() => rowData.push('Away'));
    }

    const row = worksheet.addRow(rowData);

    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.alignment = { horizontal: 'center' };
      cell.font = { size: 8 };

      // Color code productivity cells
      if (colNumber > 3) { // Skip name, work hours, date columns
        const productivity = cell.value as string;
        switch (productivity?.toLowerCase()) {
          case 'core productive':
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } };
            break;
          case 'productive':
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFADD8E6' } };
            break;
          case 'unproductive':
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFA07A' } };
            break;
          case 'idle':
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
            break;
          case 'away':
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
            break;
        }
      }
    });
  });

  // Add empty row
  worksheet.addRow([]);

  // Add summary
  const summaryRow = worksheet.addRow(['SUMMARY', `Total Employees: ${data.length}`, `Report Date: ${formattedDate}`]);
  summaryRow.getCell(1).font = { bold: true };

  const noteRow = worksheet.addRow(['NOTE:', 'Timeline shows productivity status in 10-minute intervals from 9:00 AM to 6:00 PM']);
  noteRow.getCell(1).font = { bold: true };

  // Set column widths
  worksheet.getColumn(1).width = 20; // Employee Name
  worksheet.getColumn(2).width = 12; // Work Hours
  worksheet.getColumn(3).width = 12; // Date
  
  // Set narrow width for time slot columns
  for (let i = 4; i <= headers.length; i++) {
    worksheet.getColumn(i).width = 6;
  }

  return (await workbook.xlsx.writeBuffer()) as Buffer;
}

private async generateActivityTimelinePDF(data: any[], date: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 20, layout: 'landscape' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const formattedDate = this.formatDate(date);
      const usersPerPage = 6; // Limit users per page for readability

      // Split data into pages
      const totalPages = Math.ceil(data.length / usersPerPage);

      for (let pageNum = 0; pageNum < totalPages; pageNum++) {
        if (pageNum > 0) doc.addPage({ layout: 'landscape' });

        const startIndex = pageNum * usersPerPage;
        const endIndex = Math.min(startIndex + usersPerPage, data.length);
        const pageData = data.slice(startIndex, endIndex);

        // Add title
        doc.fontSize(16).font('Helvetica-Bold');
        doc.text(`Activity Timeline Report - ${formattedDate}`, 50, 40);
        doc.fontSize(12).font('Helvetica');
        doc.text(`Page ${pageNum + 1} of ${totalPages}`, 50, 65);

        let currentY = 100;

        pageData.forEach((item, userIndex) => {
          // User header
          doc.fontSize(12).font('Helvetica-Bold');
          doc.text(`${startIndex + userIndex + 1}. ${item.name || 'N/A'} - Work Hours: ${item.workingHour || '0:00'}`, 50, currentY);
          
          currentY += 25;

          // Timeline grid
          const startX = 50;
          const cellWidth = 12;
          const cellHeight = 20;

          // Hour headers
          doc.fontSize(8).font('Helvetica-Bold');
          for (let hour = 9; hour <= 17; hour++) {
            const x = startX + (hour - 9) * (cellWidth * 6);
            doc.text(`${hour}:00`, x + 10, currentY - 5);
          }

          currentY += 15;

          // Draw timeline grid
          doc.fontSize(6).font('Helvetica');
          
          if (item.timeline && item.timeline.length > 0) {
            item.timeline.forEach((segment, segmentIndex) => {
              const hourIndex = Math.floor(segmentIndex / 6);
              const segmentInHour = segmentIndex % 6;
              
              const x = startX + (hourIndex * 6 + segmentInHour) * cellWidth;
              const y = currentY;

              // Color code and fill cell based on productivity
              const productivity = segment.productivity?.toLowerCase() || 'away';
              let fillColor = '#D3D3D3'; // Default gray for away

              switch (productivity) {
                case 'core productive':
                  fillColor = '#90EE90'; // Light green
                  break;
                case 'productive':
                  fillColor = '#ADD8E6'; // Light blue
                  break;
                case 'unproductive':
                  fillColor = '#FFA07A'; // Light salmon
                  break;
                case 'idle':
                  fillColor = '#FFFF00'; // Yellow
                  break;
                case 'away':
                  fillColor = '#D3D3D3'; // Gray
                  break;
              }

              // Fill cell with color
              doc.rect(x, y, cellWidth, cellHeight).fillAndStroke(fillColor, '#000000');

              // Add productivity letter
              const letter = productivity.charAt(0).toUpperCase();
              doc.fillColor('#000000').text(letter, x + 4, y + 7, { width: cellWidth, align: 'center' });
            });
          } else {
            // Fill with 'Away' if no data
            for (let i = 0; i < 54; i++) {
              const hourIndex = Math.floor(i / 6);
              const segmentInHour = i % 6;
              
              const x = startX + (hourIndex * 6 + segmentInHour) * cellWidth;
              const y = currentY;

              doc.rect(x, y, cellWidth, cellHeight).fillAndStroke('#D3D3D3', '#000000');
              doc.fillColor('#000000').text('A', x + 4, y + 7, { width: cellWidth, align: 'center' });
            }
          }

          currentY += cellHeight + 20;

          // Check if we need to move to next page
          if (currentY > doc.page.height - 100 && userIndex < pageData.length - 1) {
            doc.addPage({ layout: 'landscape' });
            currentY = 50;
          }
        });

        // Add legend at bottom of each page
        if (pageNum === totalPages - 1) { // Only on last page
          currentY = doc.page.height - 80;
          doc.fontSize(10).font('Helvetica-Bold');
          doc.text('Legend:', 50, currentY);
          
          currentY += 15;
          doc.fontSize(8).font('Helvetica');
          doc.text('C = Core Productive, P = Productive, U = Unproductive, I = Idle, A = Away', 50, currentY);
        }
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

private generateActivityTimelineText(data: any[], date: string): string {
  const formattedDate = this.formatDate(date);
  const reportTitle = 'ACTIVITY TIMELINE REPORT';
  const separator = '='.repeat(120);
  const subSeparator = '-'.repeat(100);

  let textContent = '';

  // Header section
  textContent += `${separator}\n`;
  textContent += `${' '.repeat((120 - reportTitle.length) / 2)}${reportTitle}\n`;
  textContent += `${separator}\n`;
  textContent += `Report Date: ${formattedDate}\n`;
  textContent += `Generated: ${new Date().toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
  })}\n`;
  textContent += `Total Employees: ${data.length}\n`;
  textContent += `${separator}\n\n`;

  // Split data into pages for readability (8 users per page for text format)
  const usersPerPage = 8;
  const totalPages = Math.ceil(data.length / usersPerPage);

  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    if (pageNum > 0) {
      textContent += `\n${'='.repeat(50)} PAGE ${pageNum + 1} ${'='.repeat(50)}\n\n`;
    }

    const startIndex = pageNum * usersPerPage;
    const endIndex = Math.min(startIndex + usersPerPage, data.length);
    const pageData = data.slice(startIndex, endIndex);

    pageData.forEach((item, userIndex) => {
      const globalIndex = startIndex + userIndex;
      textContent += `EMPLOYEE ${(globalIndex + 1).toString().padStart(3, '0')}\n`;
      textContent += `${subSeparator}\n`;
      textContent += `Name                : ${item.name || 'N/A'}\n`;
      textContent += `Work Hours          : ${item.workingHour || '0:00'}\n`;
      textContent += `Date                : ${formattedDate}\n`;
      textContent += `Activity Timeline   : 9:00 AM - 6:00 PM (10-minute intervals)\n\n`;

      // Create timeline visualization
      if (item.timeline && item.timeline.length > 0) {
        // Group by hours for better readability
        for (let hour = 9; hour <= 17; hour++) {
          const hourSegments = item.timeline.slice((hour - 9) * 6, (hour - 9) * 6 + 6);
          
          textContent += `${hour.toString().padStart(2, '0')}:00 - ${hour.toString().padStart(2, '0')}:59  `;
          
          hourSegments.forEach(segment => {
            const symbol = this.getProductivitySymbol(segment.productivity);
            textContent += symbol;
          });
          
          textContent += `  [${this.getHourSummary(hourSegments)}]\n`;
        }
      } else {
        textContent += `No activity data available for this date.\n`;
      }

      textContent += `\n${subSeparator}\n\n`;
    });
  }

  // Summary section
  textContent += `${separator}\n`;
  textContent += `SUMMARY\n`;
  textContent += `${separator}\n`;

  if (data.length > 0) {
    let totalCoreProductive = 0;
    let totalProductive = 0;
    let totalUnproductive = 0;
    let totalIdle = 0;
    let totalAway = 0;

    data.forEach(item => {
      if (item.timeline) {
        item.timeline.forEach(segment => {
          const productivity = segment.productivity?.toLowerCase() || 'away';
          switch (productivity) {
            case 'core productive': totalCoreProductive++; break;
            case 'productive': totalProductive++; break;
            case 'unproductive': totalUnproductive++; break;
            case 'idle': totalIdle++; break;
            case 'away': totalAway++; break;
          }
        });
      }
    });

    const totalSegments = totalCoreProductive + totalProductive + totalUnproductive + totalIdle + totalAway;

    textContent += `Total Employees             : ${data.length.toString().padStart(6)}\n`;
    textContent += `Total Time Segments         : ${totalSegments.toString().padStart(6)}\n`;
    textContent += `Core Productive Segments    : ${totalCoreProductive.toString().padStart(6)} (${totalSegments > 0 ? ((totalCoreProductive / totalSegments) * 100).toFixed(1) : '0.0'}%)\n`;
    textContent += `Productive Segments         : ${totalProductive.toString().padStart(6)} (${totalSegments > 0 ? ((totalProductive / totalSegments) * 100).toFixed(1) : '0.0'}%)\n`;
    textContent += `Unproductive Segments       : ${totalUnproductive.toString().padStart(6)} (${totalSegments > 0 ? ((totalUnproductive / totalSegments) * 100).toFixed(1) : '0.0'}%)\n`;
    textContent += `Idle Segments               : ${totalIdle.toString().padStart(6)} (${totalSegments > 0 ? ((totalIdle / totalSegments) * 100).toFixed(1) : '0.0'}%)\n`;
    textContent += `Away Segments               : ${totalAway.toString().padStart(6)} (${totalSegments > 0 ? ((totalAway / totalSegments) * 100).toFixed(1) : '0.0'}%)\n`;
  }

  textContent += `${separator}\n`;
  textContent += `LEGEND:\n`;
  textContent += `■ = Core Productive    ▓ = Productive    ▒ = Unproductive    ░ = Idle    · = Away\n`;
  textContent += `${separator}\n`;
  textContent += `End of Report\n`;
  textContent += `${separator}`;

  return textContent;
}

// Helper methods for activity timeline export

private getProductivityDisplayText(productivity: string): string {
  const productivityMap = {
    'core productive': 'Core Productive',
    'productive': 'Productive',
    'unproductive': 'Unproductive',
    'idle': 'Idle',
    'away': 'Away',
  };
  return productivityMap[productivity?.toLowerCase()] || 'Away';
}

private getProductivitySymbol(productivity: string): string {
  const symbolMap = {
    'core productive': '■',
    'productive': '▓',
    'unproductive': '▒',
    'idle': '░',
    'away': '·',
  };
  return symbolMap[productivity?.toLowerCase()] || '·';
}

private getHourSummary(hourSegments: any[]): string {
  const counts = {
    'core productive': 0,
    'productive': 0,
    'unproductive': 0,
    'idle': 0,
    'away': 0,
  };

  hourSegments.forEach(segment => {
    const productivity = segment.productivity?.toLowerCase() || 'away';
    if (counts.hasOwnProperty(productivity)) {
      counts[productivity]++;
    }
  });

  // Find the most common productivity status for this hour
  const maxCount = Math.max(...Object.values(counts));
  const dominantStatus = Object.keys(counts).find(key => counts[key] === maxCount);
  
  return this.getProductivityDisplayText(dominantStatus);
}
  private getStatusDisplayText(status: string): string {
    const statusMap = {
      fullDay: 'Full Day',
      halfDay: 'Half Day',
      absent: 'Absent',
      holiday: 'Holiday',
    };
    return statusMap[status] || 'Unknown';
  }

  private getDateHeaders(data: any[]): string[] {
    if (!data || data.length === 0) return [];

    const dateHeaders = [];
    let index = 1;

    while (data[0][`date_${index}`]) {
      const dateStr = data[0][`date_${index}`];
      // Format date for header (e.g., "Jun 1", "Jun 2")
      try {
        const date = new Date(dateStr);
        const formatted = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        dateHeaders.push(formatted);
      } catch {
        dateHeaders.push(dateStr);
      }
      index++;
    }

    return dateHeaders;
  }

private async generateAttendanceCSV(
  data: any[],
  startDate: string,
  endDate: string,
): Promise<string> {
  const dateHeaders = this.getDateHeaders(data);
  const headers = [
    'Employee Name',
    'Total Work Days (excluding holidays)',
    'Holidays',
    ...dateHeaders,
  ];

  let csvContent = headers.join(',') + '\n';

  data.forEach((item) => {
    const row = [
      `"${item.name || 'N/A'}"`,
      `"${item.totalWorkDays || 0}"`,
      `"${item.holidays || 0}"`,
    ];

    // Add status for each date
    let index = 1;
    while (item[`status_${index}`]) {
      row.push(`"${item[`status_${index}`] || 'N/A'}"`);
      index++;
    }

    csvContent += row.join(',') + '\n';
  });

  // Add summary row
  csvContent += '\n';
  csvContent += '"SUMMARY:"\n';
  csvContent += `"Total Employees","${data.length}"\n`;
  csvContent += '"NOTE: Total Work Days exclude holidays"\n';

  return csvContent;
}

private async generateAttendanceExcel(
  data: any[],
  startDate: string,
  endDate: string,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attendance Report');

  // Add title
  const dateRange = `${this.formatDate(startDate)} to ${this.formatDate(endDate)}`;
  worksheet.mergeCells(
    'A1:' + this.getColumnLetter(3 + this.getDateHeaders(data).length) + '1',
  );
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `Attendance Report - ${dateRange}`;
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: 'center' };

  // Add headers
  const dateHeaders = this.getDateHeaders(data);
  const headers = [
    'Employee Name',
    'Total Work Days (excluding holidays)',
    'Holidays',
    ...dateHeaders,
  ];
  const headerRow = worksheet.addRow(headers);

  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Add data rows
  data.forEach((item) => {
    const rowData = [
      item.name || 'N/A',
      item.totalWorkDays || 0,
      item.holidays || 0,
    ];

    // Add status for each date
    let index = 1;
    while (item[`status_${index}`]) {
      rowData.push(item[`status_${index}`] || 'N/A');
      index++;
    }

    const row = worksheet.addRow(rowData);

    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  // Add empty row
  worksheet.addRow([]);

  // Add summary
  const summaryRow = worksheet.addRow(['SUMMARY', `Total Employees: ${data.length}`]);
  summaryRow.getCell(1).font = { bold: true };
  
  const noteRow = worksheet.addRow(['NOTE:', 'Total Work Days exclude holidays']);
  noteRow.getCell(1).font = { bold: true };

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    column.width = 15;
  });

  return (await workbook.xlsx.writeBuffer()) as Buffer;
}

  private async generateAttendancePDF(
    data: any[],
    startDate: string,
    endDate: string,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 30, layout: 'landscape' }); // Changed to landscape for better space
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        const dateRange = `${this.formatDate(startDate)} to ${this.formatDate(endDate)}`;

        // Add title
        doc
          .fontSize(18)
          .font('Helvetica-Bold')
          .text('Attendance Report', 50, 50);
        doc.fontSize(12).font('Helvetica').text(`Period: ${dateRange}`, 50, 75);

        const startY = 110;
        const dateHeaders = this.getDateHeaders(data);
        const headers = [
          'Name',
          'Work Days',
          'Holidays',
          ...dateHeaders.map((h) => h.substring(0, 8)), // Increase character limit
        ];

        // Calculate column widths dynamically based on content and available space
        const pageWidth = doc.page.width - 100; // Account for margins (landscape mode gives more width)
        const minNameWidth = 100;
        const minNumberWidth = 45;
        const minDateWidth = 35;

        // Calculate required width for name column based on longest name
        const maxNameLength = Math.max(
          ...data.map((item) => (item.name || 'N/A').length),
          10, // minimum
        );
        const nameWidth = Math.max(
          minNameWidth,
          Math.min(maxNameLength * 6, 150),
        ); // 6px per char, max 150px

        // Calculate available width for date columns
        const fixedColumnsWidth = nameWidth + 2 * minNumberWidth; // Name + Work Days + Holidays
        const availableForDates = pageWidth - fixedColumnsWidth;
        const dateColumnWidth = Math.max(
          minDateWidth,
          availableForDates / Math.max(dateHeaders.length, 1),
        );

        const columnWidths = [
          nameWidth,
          minNumberWidth,
          minNumberWidth,
          ...dateHeaders.map(() => dateColumnWidth),
        ];

        let currentY = startY;

        // Draw header row with better spacing
        doc.fontSize(9).font('Helvetica-Bold'); // Reduced font size for headers
        let currentX = 50;
        headers.forEach((header, index) => {
          // Draw border
          doc.rect(currentX, currentY, columnWidths[index], 30).stroke();

          // Add text with proper alignment and word wrapping
          doc.text(header, currentX + 3, currentY + 8, {
            width: columnWidths[index] - 6,
            align: index === 0 ? 'left' : 'center',
            ellipsis: true,
          });
          currentX += columnWidths[index];
        });

        currentY += 30;

        // Draw data rows with improved spacing
        doc.fontSize(8).font('Helvetica'); // Smaller font for data
        data.forEach((item) => {
          currentX = 50;

          // Check if we need a new page
          if (currentY > doc.page.height - 100) {
            doc.addPage({ layout: 'landscape' });
            currentY = 50;

            // Redraw headers on new page
            doc.fontSize(9).font('Helvetica-Bold');
            let headerX = 50;
            headers.forEach((header, index) => {
              doc.rect(headerX, currentY, columnWidths[index], 30).stroke();
              doc.text(header, headerX + 3, currentY + 8, {
                width: columnWidths[index] - 6,
                align: index === 0 ? 'left' : 'center',
                ellipsis: true,
              });
              headerX += columnWidths[index];
            });
            currentY += 30;
            doc.fontSize(8).font('Helvetica');
          }

          const rowData = [
            (item.name || 'N/A').substring(0, 20), // Limit name length
            (item.totalWorkDays || 0).toString(),
            (item.holidays || 0).toString(),
          ];

          // Add status for each date
          let index = 1;
          while (item[`status_${index}`]) {
            const status = item[`status_${index}`] || 'N/A';
            // Use shorter abbreviations for PDF
            const shortStatus =
              status === 'Full Day'
                ? 'FD'
                : status === 'Half Day'
                  ? 'HD'
                  : status === 'Holiday'
                    ? 'HOL'
                    : status === 'Absent'
                      ? 'ABS'
                      : 'N/A';
            rowData.push(shortStatus);
            index++;
          }

          rowData.forEach((cellData, index) => {
            // Draw border
            doc.rect(currentX, currentY, columnWidths[index], 25).stroke();

            // Add text with proper alignment
            doc.text(String(cellData), currentX + 3, currentY + 8, {
              width: columnWidths[index] - 6,
              align: index === 0 ? 'left' : 'center',
              ellipsis: true,
            });
            currentX += columnWidths[index];
          });

          currentY += 25;
        });

        // Add summary
        currentY += 20;
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text(`Total Employees: ${data.length}`, 50, currentY);

        // Add legend
        currentY += 30;
        doc.text('Legend:', 50, currentY);
        currentY += 15;
        doc.fontSize(10).font('Helvetica');
        doc.text(
          'FD = Full Day, HD = Half Day, HOL = Holiday, ABS = Absent',
          50,
          currentY,
        );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
private generateAttendanceText(
  data: any[],
  startDate: string,
  endDate: string,
): string {
  const dateRange = `${this.formatDate(startDate)} to ${this.formatDate(endDate)}`;
  const reportTitle = 'ATTENDANCE REPORT';
  const separator = '='.repeat(100);
  const subSeparator = '-'.repeat(80);

  let textContent = '';

  // Header section
  textContent += `${separator}\n`;
  textContent += `${' '.repeat((100 - reportTitle.length) / 2)}${reportTitle}\n`;
  textContent += `${separator}\n`;
  textContent += `Report Period: ${dateRange}\n`;
  textContent += `Generated: ${new Date().toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
  })}\n`;
  textContent += `Total Employees: ${data.length}\n`;
  textContent += `${separator}\n\n`;

  // Employee data section
  if (data.length === 0) {
    textContent += `No attendance data found for the specified period.\n`;
  } else {
    data.forEach((item, index) => {
      textContent += `EMPLOYEE ${(index + 1).toString().padStart(3, '0')}\n`;
      textContent += `${subSeparator}\n`;
      textContent += `Name              : ${item.name || 'N/A'}\n`;
      textContent += `Total Work Days   : ${item.totalWorkDays || 0} (excluding holidays)\n`; // Added clarification
      textContent += `Holidays          : ${item.holidays || 0}\n`;

      // Add daily attendance
      textContent += `Daily Attendance  :\n`;
      let index_inner = 1;
      while (item[`date_${index_inner}`]) {
        const date = item[`date_${index_inner}`];
        const status = item[`status_${index_inner}`] || 'N/A';
        textContent += `  ${date.padEnd(12)} : ${status}\n`;
        index_inner++;
      }

      textContent += `${subSeparator}\n\n`;
    });
  }

  // Summary section with corrected calculations
  textContent += `${separator}\n`;
  textContent += `SUMMARY\n`;
  textContent += `${separator}\n`;

  if (data.length > 0) {
    let totalFullDays = 0;
    let totalHalfDays = 0;
    let totalAbsent = 0;
    let totalHolidays = 0;
    let totalWorkDaysSum = 0;
    let totalHolidaysSum = 0;

    data.forEach((item) => {
      totalWorkDaysSum += item.totalWorkDays || 0;
      totalHolidaysSum += item.holidays || 0;
      
      let index = 1;
      while (item[`status_${index}`]) {
        const status = item[`status_${index}`];
        if (status === 'Full Day') totalFullDays++;
        else if (status === 'Half Day') totalHalfDays++;
        else if (status === 'Absent') totalAbsent++;
        else if (status === 'Holiday') totalHolidays++;
        index++;
      }
    });

    textContent += `Total Full Day Attendance     : ${totalFullDays.toString().padStart(6)}\n`;
    textContent += `Total Half Day Attendance     : ${totalHalfDays.toString().padStart(6)}\n`;
    textContent += `Total Absences                : ${totalAbsent.toString().padStart(6)}\n`;
    textContent += `Total Holiday Records         : ${totalHolidays.toString().padStart(6)}\n`;
    textContent += `${subSeparator}\n`;
    textContent += `Total Employees               : ${data.length.toString().padStart(6)}\n`;
    textContent += `Average Work Days per Employee: ${(totalWorkDaysSum / data.length).toFixed(1).padStart(6)}\n`;
    textContent += `Average Holidays per Employee : ${(totalHolidaysSum / data.length).toFixed(1).padStart(6)}\n`;
  }

  textContent += `${separator}\n`;
  textContent += `NOTE: Total Work Days = Total Days in Period - Holidays\n`;
  textContent += `${separator}\n`;
  textContent += `End of Report\n`;
  textContent += `${separator}`;

  return textContent;
}

  // Helper method to convert column number to letter (for Excel)
  private getColumnLetter(columnNumber: number): string {
    let letter = '';
    while (columnNumber > 0) {
      const remainder = (columnNumber - 1) % 26;
      letter = String.fromCharCode(65 + remainder) + letter;
      columnNumber = Math.floor((columnNumber - 1) / 26);
    }
    return letter;
  }
  private generateText(data: any[], date: string): string {
    const formattedDate = this.formatDate(date);
    const reportTitle = 'TIMESHEET REPORT';
    const separator = '='.repeat(80);
    const subSeparator = '-'.repeat(60);

    let textContent = '';

    // Header section
    textContent += `${separator}\n`;
    textContent += `${' '.repeat((80 - reportTitle.length) / 2)}${reportTitle}\n`;
    textContent += `${separator}\n`;
    textContent += `Report Date: ${formattedDate}\n`;
    textContent += `Generated: ${new Date().toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    })}\n`;
    textContent += `Total Employees: ${data.length}\n`;
    textContent += `${separator}\n\n`;

    // Employee data section
    if (data.length === 0) {
      textContent += `No employee data found for ${formattedDate}\n`;
    } else {
      data.forEach((item, index) => {
        textContent += `EMPLOYEE ${(index + 1).toString().padStart(3, '0')}\n`;
        textContent += `${subSeparator}\n`;
        textContent += `Name        : ${item.name || 'N/A'}\n`;
        textContent += `Check In    : ${item.InTime || '00:00'}\n`;
        textContent += `Check Out   : ${item.OutTime || '00:00'}\n`;
        textContent += `Work Hours  : ${item.WorkHour || '00:00'}\n`;
        textContent += `Date        : ${formattedDate}\n`;

        // Calculate status based on work hours
        const workHour = item.WorkHour || '00:00';
        const [hours, minutes] = workHour.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes;
        const totalHours = totalMinutes / 60;

        let status = 'Absent';
        if (totalHours >= 8) status = 'Full Day';
        else if (totalHours >= 4) status = 'Half Day';
        else if (totalHours > 0) status = 'Partial';

        textContent += `Status      : ${status}\n`;
        textContent += `${subSeparator}\n\n`;
      });
    }

    // Summary section
    textContent += `${separator}\n`;
    textContent += `SUMMARY\n`;
    textContent += `${separator}\n`;

    if (data.length > 0) {
      const fullDayCount = data.filter((item) => {
        const workHour = item.WorkHour || '00:00';
        const [hours] = workHour.split(':').map(Number);
        return hours >= 8;
      }).length;

      const halfDayCount = data.filter((item) => {
        const workHour = item.WorkHour || '00:00';
        const [hours] = workHour.split(':').map(Number);
        return hours >= 4 && hours < 8;
      }).length;

      const partialCount = data.filter((item) => {
        const workHour = item.WorkHour || '00:00';
        const [hours] = workHour.split(':').map(Number);
        return hours > 0 && hours < 4;
      }).length;

      const absentCount =
        data.length - fullDayCount - halfDayCount - partialCount;

      textContent += `Full Day Attendance    : ${fullDayCount.toString().padStart(3)} employees\n`;
      textContent += `Half Day Attendance    : ${halfDayCount.toString().padStart(3)} employees\n`;
      textContent += `Partial Attendance     : ${partialCount.toString().padStart(3)} employees\n`;
      textContent += `Absent                 : ${absentCount.toString().padStart(3)} employees\n`;
      textContent += `${subSeparator}\n`;
      textContent += `Total Employees        : ${data.length.toString().padStart(3)}\n`;
    }

    textContent += `${separator}\n`;
    textContent += `End of Report\n`;
    textContent += `${separator}`;

    return textContent;
  }
  async getLastestActivity(
    organid: string,
  ): Promise<{ [key: string]: string }> {
    try {
      // Fetch all user activities for the organization
      const userActivities = await this.userActivityRepository.find({
        where: { organization_id: organid },
      });

      // Map latest activity for each user
      const userLatestActivities = userActivities.reduce(
        (acc, activity) => {
          const userId = activity.user_uid;
          const activityTimestamp = new Date(activity.timestamp).getTime();

          // Only update if no entry exists or the current activity is newer
          if (
            !acc[userId] ||
            new Date(acc[userId].timestamp).getTime() < activityTimestamp
          ) {
            acc[userId] = activity;
          }

          return acc;
        },
        {} as { [key: string]: UserActivity },
      );

      // Map to userId -> lastActive (human-readable time difference)
      const now = Date.now();
      const result = Object.keys(userLatestActivities).reduce(
        (acc, userId) => {
          const lastActivityTime = new Date(
            userLatestActivities[userId].timestamp,
          ).getTime();
          acc[userId] = this.getTimeAgo(now - lastActivityTime); // Human-readable time
          return acc;
        },
        {} as { [key: string]: string },
      );

      console.log('User Latest Activity:', result);
      return result;
    } catch (error) {
      console.error('Error fetching latest activity:', error);
      throw new Error('Failed to fetch latest activity');
    }
  }

  private getTimeAgo(diffInMs: number): string {
    const seconds = Math.floor(diffInMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
  }

  async getAppUsageStatics(
    organizationId: string,
    userId: string,
  ): Promise<any> {
    try {
      const userActivities = await this.userActivityRepository.find({
        where: { organization_id: organizationId, user_uid: userId },
      });

      // Count the active time for each app
      const totalActiveTime: Record<string, number> = {};
      userActivities.forEach((activity) => {
        if (activity?.app_name) {
          if (totalActiveTime[activity.app_name]) {
            totalActiveTime[activity.app_name]++;
          } else {
            totalActiveTime[activity.app_name] = 1;
          }
        }
      });

      // Calculate percentages and transform the format
      const formattedData = this.calculatePercentages(totalActiveTime);

      return formattedData;
    } catch (error) {
      console.log('Error fetching app usage statics', error);
      throw new Error('Failed to fetch app usage statics');
    }
  }

  async getCalculatedLogic(organId: string): Promise<CalculatedLogic> {
    return await this.calculatedLogicRepository.findOne({
      where: { organization_id: organId },
    });
  }

  private calculatePercentages = (
    usageData: Record<string, number>,
  ): { name: string; percent: number }[] => {
    const totalUsage = Object.values(usageData).reduce(
      (sum, count) => sum + count,
      0,
    );
    const percentages: { name: string; percent: number }[] = [];

    for (const [appName, usageCount] of Object.entries(usageData)) {
      percentages.push({
        name: appName,
        percent: Math.round((usageCount / totalUsage) * 100),
      });
    }

    return percentages;
  };

  async getDeskTopName(organization: string): Promise<string> {
    const appName = await this.desktopAppRepository.findOne({
      where: { organizationId: organization },
    });
    console.log(appName);
    return appName.name || 'trackTime';
  }
  async updateOrganization(
    Organization: Organization,
    data: string | any,
  ): Promise<string> {
    console.log(data);
    try {
      const orga = await this.organizationRepository.findOne({
        where: { id: Organization?.id },
      });
      if (orga?.id) {
        data?.country && (orga.country = data.country);
        data?.timeZone && (orga.timeZone = data.timeZone);
        data?.name && (orga.name = data.name);
        data?.logo && (orga.logo = data.logo);
        await this.organizationRepository.save(orga);
        return orga.id;
      }
      return null;
    } catch (error) {
      console.log({ error: error.message });
      return null;
    }
  }

  /**
   * Update organization logo with Wasabi URL
   */
  async updateOrganizationLogo(
    organizationId: string,
    logoUrl: string,
  ): Promise<boolean> {
    try {
      const organization = await this.organizationRepository.findOne({
        where: { id: organizationId },
      });

      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      organization.logo = logoUrl;
      await this.organizationRepository.save(organization);

      this.logger.log(`✅ Organization logo updated: ${organizationId} -> ${logoUrl}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error updating organization logo: ${error.message}`);
      throw new BadRequestException(`Error updating organization logo: ${error.message}`);
    }
  }
  async fetchScreenShot(): Promise<any[]> {
    // const bucketName = process.env.WASABI_BUCKET_NAME;
    const bucketName = this.ConfigureService.get<string>('WASABI_BUCKET_NAME');
    const params = {
      Bucket: bucketName,
      Prefix: 'thumbnails/',
    };
    try {
      const data = await this.s3.listObjectsV2(params).promise();
      const images = data.Contents.map((item) => ({
        key: item.Key,
        lastModified: item.LastModified,
        size: item.Size,
        url: this.s3.getSignedUrl('getObject', {
          Bucket: bucketName,
          Key: item.Key,
          Expires: 60 * 5,
        }),
      }));
      return images;
    } catch (error) {
      throw new Error(
        `Failed to fetch images from wasabi due to error:${error?.message}`,
      );
    }
  }

  async getAllusers(organId: string): Promise<User[]> {
    const users = await this.userRepository.find({
      where: { organizationId: organId },
    });
    return users;
  }
  async createOrganization(data: CreateOrganizationDTO): Promise<Organization> {
    // const organization = this.organizationRepository.create({
    //   name: data.name,
    //   logo: data.logo || null, // Assuming logo can be null
    //   country: data.country,
    //   teamSize: data.teamSize,
    //   type: data.type,
    // });
    const organisation = new Organization();
    organisation.name = data.name.toLowerCase();
    organisation.country = data.country;
    organisation.logo = data.logo;
    organisation.teamSize = data.teamSize;
    organisation.type = data.type;
    organisation.timeZone = data.timeZone || null;
    const savedOrganization =
      await this.organizationRepository.save(organisation);
    console.log('Saved Organization:', savedOrganization);
    return savedOrganization;
  }

  async createDesktopApplication(data: any): Promise<DesktopApplication> {
    console.log(data);
    const desktopApp = new DesktopApplication();
    desktopApp.name = data?.name;
    desktopApp.logo = data?.logo || 'http://example.com/favicon.ico';
    desktopApp.type = data?.type || 'application';
    desktopApp.version = data?.version || '1.0.0';
    desktopApp.organizationId = data?.organizationId;

    // let error = validate(desktopApp);
    // if(error?.length > 0) {
    //   throw new BadRequestException({Error:"Error creating desktop Appplication",})
    // }

    const savedDesktopApp = await this.desktopAppRepository.save(desktopApp);
    console.log('Saved Desktop Application:', savedDesktopApp);
    return savedDesktopApp;
  }

  async findOrganization(name: string): Promise<Organization> {
    let isOrganization = await this.organizationRepository.findOne({
      where: { name },
    });
    // if(isOrganization) {
    //   // isOrganization = await this.organizationAdminService.findOrganization(isOrganization.id)
    //   // return isOrganization.id;
    // }

    return isOrganization;
  }

  async createTeam(createTeamDto: CreateTeamDTO): Promise<Team> {
    console.log('createTeamDto:', createTeamDto);

    // Check if a team with the same name already exists
    const existingTeam = await this.teamRepository.find({
      where: { organizationId: createTeamDto?.organizationId },
    });
    const isExistTeam = existingTeam.find(
      (t) => t?.name === createTeamDto.name,
    );
    if (existingTeam?.length && isExistTeam?.id) {
      console.log('Existing team found:', existingTeam);
      return isExistTeam;
    }

    // Create a new team instance
    const team = this.teamRepository.create({ name: createTeamDto?.name });
    console.log('First team created:', team);

    if (createTeamDto?.organizationId) {
      console.log(
        'Entered organization check with organizationId:',
        createTeamDto.organizationId,
      );

      // Find the organization by the given organizationId
      const organization = await this.organizationRepository.findOne({
        where: { id: createTeamDto.organizationId },
      });

      console.log('Organization found:', organization);

      if (!organization) {
        throw new Error('Organization not found');
      }

      // Assign the organization to the team
      team.organization = organization;
    }

    // Save the team and return it
    const savedTeam = await this.teamRepository.save(team);
    console.log('Saved Team:', savedTeam);

    return savedTeam;
  }

  async addUserToTeam(userId: string, teamId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { userUUID: userId },
    });
    if (!user) {
      throw new Error('User not found');
    }

    const team = await this.teamRepository.findOne({ where: { id: teamId } });
    if (!team) {
      throw new Error('Team not found');
    }

    user.team = team;
    const updatedUser = await this.userRepository.save(user);
    console.log('Updated User:', updatedUser);
    return updatedUser;
  }
  async findAllUsers(organizationId: string): Promise<User[]> {
    try {
      console.log('Finding all users for organization:', organizationId);

      const users = await this.userRepository.find({
        where: { organizationId },
        order: { created_at: 'DESC' },
        relations: ['team'],
      });

      console.log(
        `Found ${users.length} users for organization ${organizationId}`,
      );
      return users;
    } catch (error) {
      console.error('Error in findAllUsers:', error);
      throw new Error('Failed to fetch users');
    }
  }

  async findUserById(userId: string): Promise<User> {
    try {
      console.log('Finding user by ID:', userId);
      const user = await this.userRepository.findOne({
        where: { userUUID: userId },
        relations: ['team'],
      });
      console.log('User find result:', user ? 'Found' : 'Not found');
      return user;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  async findAllDevices(organId: string): Promise<Devices[]> {
    try {
      console.log('Finding all devices for organization:', organId);

      let devices = await this.devicesRepository.find({
        where: { organization_uid: organId },
        order: { created_at: 'DESC' },
      });

      console.log(
        `Found ${devices.length} devices for organization ${organId}`,
      );

      if (!devices?.length) {
        console.log('No devices found for organization:', organId);
        return [];
      }

      // Get user activity data for additional device information
      let deviceInfo = await this.userActivityRepository.find({
        where: { organization_id: organId },
        order: { timestamp: 'DESC' },
      });

      console.log('Found device activities:', deviceInfo.length);

      // Map device info to devices
      devices = devices.map((device) => {
        // Find the most recent activity for this device
        const recentActivity = deviceInfo.find(
          (activity) => activity.user_uid === device.device_uid,
        );

        if (recentActivity) {
          device['deviceInfo'] = recentActivity;
          device['lastActivity'] = recentActivity.timestamp;
        }

        return device;
      });

      return devices;
    } catch (error) {
      console.error('Error in findAllDevices:', error);
      throw new Error('Failed to fetch devices');
    }
  }
  async getRecentActivityData(organizationId: string): Promise<any> {
    try {
      // Get all devices for the organization
      const devices = await this.devicesRepository.find({
        where: { organization_uid: organizationId },
      });

      const deviceIds = devices.map((device) => device.device_uid);

      // Get all user activities for the organization
      const userActivities = await this.userActivityRepository.find({
        where: { organization_id: organizationId },
        order: { timestamp: 'DESC' },
      });

      const result = {};

      for (const device of devices) {
        // Get activities for this specific device
        const deviceActivities = userActivities.filter(
          (activity) => activity.user_uid === device.device_uid,
        );

        if (deviceActivities.length === 0) {
          result[device.device_uid] = {
            inTime: '00:00',
            outTime: '00:00',
            activeTime: '00:00',
            status: 'away',
            productivity: '0%',
            lastActiveDate: null,
          };
          continue;
        }

        // Find the most recent day with data (yesterday first, then most recent)
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Try to get yesterday's data first
        let targetActivities = deviceActivities.filter((activity) =>
          this.isSameDay(new Date(activity.timestamp), yesterday),
        );

        let targetDate = yesterday;
        let status = 'idle'; // Data available but not today

        // If no yesterday data, get the most recent day's data
        if (targetActivities.length === 0) {
          // Group activities by date
          const activitiesByDate = this.groupActivitiesByDate(deviceActivities);
          const dates = Object.keys(activitiesByDate).sort(
            (a, b) => new Date(b).getTime() - new Date(a).getTime(),
          );

          if (dates.length > 0) {
            const mostRecentDate = dates[0];
            targetActivities = activitiesByDate[mostRecentDate];
            targetDate = new Date(mostRecentDate);

            // Check if it's today's data
            if (this.isSameDay(targetDate, today)) {
              status = 'active';
            }
          }
        }

        if (targetActivities.length === 0) {
          result[device.device_uid] = {
            inTime: '00:00',
            outTime: '00:00',
            activeTime: '00:00',
            status: 'away',
            productivity: '0%',
            lastActiveDate: null,
          };
          continue;
        }

        // Sort activities by timestamp for the target date
        const sortedActivities = targetActivities.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );

        const firstActivity = sortedActivities[0];
        const lastActivity = sortedActivities[sortedActivities.length - 1];

        // Calculate in/out times
        const inTime = this.formatTime(firstActivity.timestamp);
        const outTime = this.formatTime(lastActivity.timestamp);

        // Calculate active time (duration between first and last activity)
        const activeTime = this.calculateDuration(
          firstActivity.timestamp,
          lastActivity.timestamp,
        );

        // Calculate productivity for that day
        const productivity = await this.calculateDayProductivity(
          targetActivities,
          targetDate,
        );

        result[device.device_uid] = {
          inTime,
          outTime,
          activeTime,
          status,
          productivity: `${productivity}%`,
          lastActiveDate: this.formatDate(targetDate),
        };
      }

      return result;
    } catch (error) {
      console.error('Error getting recent activity data:', error);
      throw new Error('Failed to get recent activity data');
    }
  }
  private groupActivitiesByDate(activities: UserActivity[]): {
    [date: string]: UserActivity[];
  } {
    return activities.reduce((grouped, activity) => {
      const date = new Date(activity.timestamp).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(activity);
      return grouped;
    }, {});
  }

  // Helper method to calculate productivity for a day
  private async calculateDayProductivity(
    activities: UserActivity[],
    date: Date,
  ): Promise<number> {
    try {
      if (activities.length === 0) return 0;

      // Count productive vs total activities
      const productiveActivities = activities.filter((activity) => {
        // You can customize this logic based on your productivity criteria
        // For now, assuming activities with certain app names or page titles are productive
        const productiveApps = [
          'vscode',
          'visual studio',
          'intellij',
          'sublime',
          'atom',
        ];
        const unproductiveApps = [
          'youtube',
          'facebook',
          'instagram',
          'twitter',
          'tiktok',
        ];

        const appName = activity.app_name?.toLowerCase() || '';
        const pageTitle = activity.page_title?.toLowerCase() || '';

        // Check if it's a productive app
        if (
          productiveApps.some(
            (app) => appName.includes(app) || pageTitle.includes(app),
          )
        ) {
          return true;
        }

        // Check if it's an unproductive app
        if (
          unproductiveApps.some(
            (app) => appName.includes(app) || pageTitle.includes(app),
          )
        ) {
          return false;
        }

        // Default to neutral/productive for unknown apps
        return true;
      });

      const productivityPercentage = Math.round(
        (productiveActivities.length / activities.length) * 100,
      );

      return productivityPercentage;
    } catch (error) {
      console.error('Error calculating productivity:', error);
      return 0;
    }
  }

  // Helper method to format date
  private formatDate(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  async fetchAllOrganization(organId: string): Promise<Organization> {
    return await this.organizationRepository.findOne({
      where: { id: organId },
    });
  }
  async getAllTeam(organId: string): Promise<Team[]> {
    return await this.teamRepository.find({
      where: { organizationId: organId },
    });
  }
  // In your OnboardingService
  async getUserActivityDetails(
    organId: string,
    id: string,
    page: number,
    limit: number,
  ): Promise<UserActivity[]> {
    //If findOneBy is not recognized or you prefer a more explicit approach, use findOne:
    //apply here the logic for sorting the data in timing format and then get's teh data wanted
    const FetchedData = await this.userActivityRepository.find({
      where: { user_uid: id, organization_id: organId },
    });
    // console.log('fetched data', FetchedData);
    const ImgData = await this.fetchScreenShot();
    console.log({ imgData: 'ImgData.length' });
    const userData = await this.findAllDevices(organId);

    if (!FetchedData) {
      throw new Error('User not found');
    }

    const userUnsortedData = FetchedData?.map((userD) => {
      ImgData.forEach((img) => {
        let imgAcctivity = img?.key.split('/')[1].split('|')[0];
        if (userD.activity_uuid === imgAcctivity) {
          userD['ImgData'] = img;
        }
      });
      userData.map((user) => {
        if (user.device_uid === userD.user_uid) {
          userD['user_name'] = user.user_name;
        }
      });
      return userD;
    });

    userUnsortedData?.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();

      return dateB - dateA;
    });

    const skip = (page - 1) * limit;
    const take = limit * page;
    const userDataInLimit = userUnsortedData?.slice(skip, take);
    // console.log(page, limit, skip, take);
    return userDataInLimit;
    // const user = await this.userActivityRepository.find({ where: { user_uid:id },
    // skip,
    // take
    // });
    //  const userDetails = userUnsortedData?.slice(skip,take+1);

    // user?.sort((a,b)=>
    // {
    //   const dateA = new Date(a.timestamp).getTime();
    //   const dateB = new Date(b.timestamp).getTime();

    //   return dateB - dateA
    // } );

    // return user;
  }

  async getUserDataCount(id: string): Promise<Number> {
    const userDataCount = await this.userActivityRepository.find({
      where: { user_uid: id },
    });

    return userDataCount?.length;
  }

  //service for updating user configs
  async updateUserConfig(id: string, status: string): Promise<Devices> {
    if (!id) {
      return null;
    }

    let userDetails = await this.devicesRepository.findOne({
      where: { device_uid: id },
    });

    if (!userDetails) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    // console.log('status',status);
    let updatedConfig: UpdateConfigType = {
      trackTimeStatus: status as TrackTimeStatus,
    };
    try {
      await this.devicesRepository.update(
        { device_uid: id },
        { config: updatedConfig },
      );
      userDetails = await this.devicesRepository.findOne({
        where: { device_uid: id },
      });
      return userDetails;
    } catch (error) {
      console.log(`Failed to update user configuration: ${error.message}`);
      throw new Error(`Failed to update user configuration: ${error.message}`);
    }
  }

  async getAllUserActivityData(organId: string): Promise<UserActivity[]> {
    const userData = await this.userActivityRepository.find({
      where: { organization_id: organId },
    });
    // console.log("userData",userData);
    return userData;
  }
  async getTimeSheetData(
    userActivities: UserActivity[],
    from: string,
    organizationId: string,
  ) {
    // Fetch all devices associated with the organization
    const devices = await this.devicesRepository.find({
      where: { organization_uid: organizationId },
    });

    const deviceIds = devices.map((device) => device.device_uid);

    // Filter activities based on device IDs and target date
    const targetDate = new Date(from);
    const filteredActivities = userActivities.filter(
      (activity) =>
        deviceIds.includes(activity.user_uid) &&
        this.isSameDay(new Date(activity.timestamp), targetDate),
    );

    // Group activities by user/device
    const groupedByUser = this.groupByUser(filteredActivities);

    // Process daily, weekly, and monthly data with devices list
    const daily = this.calculateDaily(groupedByUser, devices);
    const weekly = this.calculateWeekly(groupedByUser, targetDate, devices);
    const monthly = this.calculateMonthly(groupedByUser, targetDate, devices);

    return { daily, weekly, monthly };
  }

  private calculateDaily(
    groupedActivities: Record<string, UserActivity[]>,
    devices: Devices[],
  ) {
    return devices.map(({ device_uid, device_name, user_name }) => {
      const activities = groupedActivities[device_uid] || [];

      if (activities.length === 0) {
        return {
          id: device_uid,
          name: user_name || device_name,
          InTime: '00:00',
          OutTime: '00:00',
          WorkHour: '00:00',
        };
      }

      const sortedActivities = activities.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

      const inTime = sortedActivities[0].timestamp;
      const outTime = sortedActivities[sortedActivities.length - 1].timestamp;

      return {
        id: device_uid,
        name: user_name || device_name,
        InTime: this.formatTime(inTime),
        OutTime: this.formatTime(outTime),
        WorkHour: this.calculateDuration(inTime, outTime),
      };
    });
  }

  private calculateWeekly(
    groupedActivities: Record<string, UserActivity[]>,
    targetDate: Date,
    devices: Devices[],
  ) {
    let weekStart = new Date(targetDate);
    weekStart.setDate(weekStart.getDate() - 6);

    return devices.map(({ device_uid, device_name, user_name }) => {
      const activities = groupedActivities[device_uid] || [];

      if (activities.length === 0) {
        return {
          id: device_uid,
          name: user_name || device_name,
          WorkHour: '00:00',
          WorkDays: 0,
        };
      }

      const weeklyActivities = activities.filter((activity) => {
        const activityDate = new Date(activity.timestamp);
        return activityDate >= weekStart && activityDate <= targetDate;
      });

      const daysWorked = new Set(
        weeklyActivities.map((activity) =>
          new Date(activity.timestamp).toDateString(),
        ),
      );

      let totalWorkHours = 0;
      if (weeklyActivities.length > 1) {
        const allTimestamps = weeklyActivities.map((activity) =>
          new Date(activity.timestamp).getTime(),
        );
        const weekInTime = Math.min(...allTimestamps);
        const weekOutTime = Math.max(...allTimestamps);
        totalWorkHours = (weekOutTime - weekInTime) / (1000 * 60 * 60);
      }

      return {
        id: device_uid,
        name: user_name || device_name,
        WorkHour: totalWorkHours.toFixed(2),
        WorkDays: daysWorked.size,
      };
    });
  }

  private calculateMonthly(
    groupedActivities: Record<string, UserActivity[]>,
    targetDate: Date,
    devices: Devices[],
  ) {
    const monthStart = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      1,
    );

    return devices.map(({ device_uid, device_name, user_name }) => {
      const activities = groupedActivities[device_uid] || [];

      if (activities.length === 0) {
        return {
          id: device_uid,
          name: user_name || device_name,
          WorkHour: '00:00',
          WorkDays: 0,
        };
      }

      const monthlyActivities = activities.filter((activity) => {
        const activityDate = new Date(activity.timestamp);
        return activityDate >= monthStart && activityDate <= targetDate;
      });

      const daysWorked = new Set(
        monthlyActivities.map((activity) =>
          new Date(activity.timestamp).toDateString(),
        ),
      );

      let totalWorkHours = 0;
      if (monthlyActivities.length > 1) {
        const allTimestamps = monthlyActivities.map((activity) =>
          new Date(activity.timestamp).getTime(),
        );
        const monthInTime = Math.min(...allTimestamps);
        const monthOutTime = Math.max(...allTimestamps);
        totalWorkHours = (monthOutTime - monthInTime) / (1000 * 60 * 60);
      }

      return {
        id: device_uid,
        name: user_name || device_name,
        WorkHour: totalWorkHours.toFixed(2),
        WorkDays: daysWorked.size,
      };
    });
  }

  private groupByUser(activities: UserActivity[]) {
    return activities.reduce((grouped, activity) => {
      if (!grouped[activity.user_uid]) {
        grouped[activity.user_uid] = [];
      }
      grouped[activity.user_uid].push(activity);
      return grouped;
    }, {});
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  private formatTime(timestamp: Date): string {
    const date = new Date(timestamp);
    return date.toTimeString().split(' ')[0].slice(0, 5); // HH:mm format
  }

  private calculateDuration(start: Date, end: Date): string {
    const duration =
      (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60); // in hours
    const hours = Math.floor(duration);
    const minutes = Math.round((duration % 1) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  async validateOrganization(organid: string): Promise<boolean> {
    const organId = await this.organizationRepository.findOne({
      where: { id: organid },
    });
    if (organId?.id) {
      return true;
    }
    return false;
  }

async createDeviceForUser(
  organization_uid: string,
  userName: string,
  email: string,
  user_uid: string,
  mac_address: string,
): Promise<string> {
  console.log('Entering device creation');

  // Convert empty strings to null for UUID fields
  const cleanUserUid = user_uid && user_uid.trim() !== '' ? user_uid : null;
  const cleanMacAddress = mac_address && mac_address.trim() !== '' ? mac_address : null;

  // Check if a device already exists for the user (only if user_uid is not null)
  let isDeviceAlreadyExist = null;
  if (cleanUserUid) {
    isDeviceAlreadyExist = await this.devicesRepository.findOne({
      where: { user_uid: cleanUserUid },
    });
    console.log('Device already exists:', isDeviceAlreadyExist);

    if (isDeviceAlreadyExist) {
      return isDeviceAlreadyExist.device_uid;
    }
  }

  // Efficiently find the last device with the highest number
  const lastDevice = await this.devicesRepository
    .createQueryBuilder('device')
    .where('device.organization_uid = :orgId', { orgId: organization_uid })
    .orderBy('device.created_at', 'DESC')
    .getOne();

  let nextDeviceNumber = 1;
  if (lastDevice?.device_name) {
    const match = lastDevice.device_name.match(/Device-(\d+)/);
    if (match) {
      const lastNumber = parseInt(match[1]);
      nextDeviceNumber = lastNumber + 1;
    }
  }

  const deviceName = `Device-${nextDeviceNumber}`;

  // Create the device for the user
  console.log('Creating device with name:', deviceName);
  const deviceForUser = this.devicesRepository.create({
    organization_uid,
    user_name: userName,
    user_uid: cleanUserUid,
    mac_address: cleanMacAddress,
    device_name: deviceName,
    config: { trackTimeStatus: TrackTimeStatus.Resume },
  });

  // Save the new device to the database
  const savedDevice = await this.devicesRepository.save(deviceForUser);
  console.log('Created device:', savedDevice.device_uid);

  return savedDevice.device_uid;
}

  async getUserDeviceId(deviceId: string) {
    try {
      const device = await this.devicesRepository.findOne({
        where: { device_uid: deviceId },
      });
      const organizationDetails = await this.organizationRepository.findOne({
        where: { id: device.organization_uid },
      });
      const users = await this.userRepository.findOne({
        where: { userUUID: device?.user_uid },
        relations: ['team'],
      });

      console.log('users_team', users?.team);
      device['organizationDetails'] = organizationDetails;
      device['organizationTeam'] = users?.team;
      console.log(device);

      return device;
    } catch (error) {
      console.log(error);
    }
    return null;
  }
  async createDeviceIdForUser(
    mac_address: string,
    user_name: string,
    organizationId: string,
  ) {
    try {
      // const isOrganizationExist = await this.organizationRepository.find({where: {}})
    } catch (err) {}
  }

async checkDeviceIdExist(
  mac_address: string,
  device_user_name: string,
): Promise<string> {
  try {
    const cleanMacAddress = mac_address && mac_address.trim() !== '' ? mac_address : null;
    
    if (!cleanMacAddress) {
      return null;
    }

    const isExist = await this.devicesRepository.findOne({
      where: { mac_address: cleanMacAddress },
    });

    console.log('mac_address', cleanMacAddress);
    console.log('device-user-name', device_user_name);
    console.log('isExist', isExist);

    if (isExist?.user_name && device_user_name.toLowerCase()) {
      return isExist.device_uid;
    }

    return null;
  } catch (err) {
    console.log(err?.message);
    return null;
  }
}
  
async checkDeviceIdExistWithDeviceId(
  mac_address: string,
  device_id: string,
  device_user_name: string,
): Promise<string> {
  try {
    // Clean the input parameters
    const cleanMacAddress = mac_address && mac_address.trim() !== '' ? mac_address : null;
    const cleanDeviceId = device_id && device_id.trim() !== '' ? device_id : null;

    // Build the where conditions dynamically
    const whereConditions: any[] = [];
    
    if (cleanDeviceId) {
      whereConditions.push({ device_uid: cleanDeviceId });
    }
    
    if (cleanMacAddress) {
      whereConditions.push({ mac_address: cleanMacAddress });
    }

    // If no valid conditions, return null
    if (whereConditions.length === 0) {
      return null;
    }

    // Find the device with the given device UID or mac_address
    let existingDevice = await this.devicesRepository.findOne({
      where: whereConditions,
    });

    // If device found by device_id but no mac_address, update it
    if (existingDevice && !existingDevice.mac_address && cleanMacAddress) {
      // Check if another device already has this mac_address
      const conflictingDevice = await this.devicesRepository.findOne({
        where: { mac_address: cleanMacAddress },
      });

      // Remove conflicting mac_address if found
      if (conflictingDevice && conflictingDevice.device_uid !== existingDevice.device_uid) {
        conflictingDevice.mac_address = null;
        await this.devicesRepository.save(conflictingDevice);
      }

      existingDevice.mac_address = cleanMacAddress;
      await this.devicesRepository.save(existingDevice);
    }

    return existingDevice ? existingDevice.device_uid : null;
  } catch (error) {
    this.logger.error(`Error checking device ID: ${error.message}`, error.stack);
    throw error;
  }
}

async getUserConfig(deviceId: string, organizationId: string): Promise<any> {
  try {
    this.logger.debug(
      `Fetching user config for device: ${deviceId}, organization: ${organizationId}`,
    );

    // Validate that deviceId and organizationId are not null or empty
    if (!deviceId || !organizationId) {
      this.logger.error(
        `Invalid input: deviceId or organizationId is missing.`,
      );
      throw new Error(
        'Invalid input: deviceId or organizationId is missing.',
      );
    }

    // Fetch the user config from the database
    let userConfig = await this.devicesRepository.findOne({
      where: { device_uid: deviceId, organization_uid: organizationId },
    });

    this.logger.log(`device_config: ${JSON.stringify(userConfig)}`);
    
    if (!userConfig) {
      this.logger.warn(
        `User config not found for device ${deviceId} and organization ${organizationId}`,
      );
      return null;
    }

    // Check if the config is null and update it with default value if necessary
    if (!userConfig.config) {
      this.logger.log(
        `User config is null. Setting default config for device: ${deviceId}`,
      );

      userConfig.config = { trackTimeStatus: TrackTimeStatus.Resume };
      await this.devicesRepository.save(userConfig);
    }

    return userConfig;
  } catch (error) {
    this.logger.error(
      `Failed to fetch or update user config: ${error.message}`,
      error.stack,
    );
    throw new Error(
      `Failed to fetch or update user config: ${error.message}`,
    );
  }
}
  async findDesktopApplication(orgId: string): Promise<any> {
    try {
      let desktopApp = await this.desktopAppRepository.findOne({
        where: { organizationId: orgId },
      });
      return desktopApp;
    } catch (error) {
      throw new BadRequestException(`Error:- ${error}`);
    }
  }

  async findAllTeamsForOrganization(orgId: string): Promise<any> {
    try {
      const organizationTeams = await this.teamRepository.find({
        where: { organizationId: orgId },
      });
      if (organizationTeams?.length) {
        const teamData = await Promise.all(
          organizationTeams.map(async (team) => {
            const teamMembers = await this.userRepository.find({
              where: { teamId: team.id },
            });
            return {
              ...team,
              teamMembersCount: teamMembers.length,
              teamMembers: teamMembers,
            };
          }),
        );
        console.log('Team data: ', teamData);
        return teamData;
      }
      return [];
    } catch (error) {
      throw new BadRequestException(`Error: ${error.message}`);
    }
  }

  async findTeamForOrganizationWithId(
    organId: string,
    teamId: string,
  ): Promise<Team> {
    try {
      let isExistTeam = await this.teamRepository.findOne({
        where: { id: teamId },
      });

      // if(isExistTeam?.id){

      // }
      return isExistTeam;
    } catch (err) {
      throw new BadRequestException(`Error:- ${err?.message}`);
    }
  }

  async findTeamForOrganization(
    organId: string,
    teamName: string,
  ): Promise<any> {
    try {
      let isExistTeam = await this.teamRepository.find({
        where: { organizationId: organId },
      });
      console.log('isExistTeam', isExistTeam);
      if (!isExistTeam.length) {
        return false;
      }
      let team = isExistTeam.find(
        (team) => team.name.toLowerCase() === teamName.toLowerCase(),
      );

      return team;
    } catch (error) {
      throw new BadRequestException(`Error:- ${error}`);
    }
  }
  async ValidateUserByGmail(email: string) {
    try {
      let user = await this.userRepository.findOne({ where: { email: email } });
      return user;
    } catch (err) {
      throw new BadRequestException(`Error: ${err}`);
    }
  }

  async validateDeviceById(deviceId: string): Promise<Devices> {
    try {
      console.log('Validating device by ID:', deviceId);
      const device = await this.devicesRepository.findOne({
        where: { device_uid: deviceId },
      });
      console.log('Device validation result:', device ? 'Found' : 'Not found');
      return device;
    } catch (error) {
      console.error('Error validating device by ID:', error);
      throw error;
    }
  }

  async updateDevice(device: Devices): Promise<Devices> {
    try {
      console.log('Updating device:', device.device_uid);
      const updatedDevice = await this.devicesRepository.save(device);
      console.log('Device update successful');
      return updatedDevice;
    } catch (error) {
      console.error('Error updating device:', error);
      throw error;
    }
  }
  async validateUserIdLinked(userId: string, deviceId: string): Promise<any> {
    try {
      // First, check if the user is already assigned to another device
      const existingAssignment = await this.devicesRepository.findOne({
        where: { user_uid: userId },
      });

      if (existingAssignment && existingAssignment.device_uid !== deviceId) {
        // Remove the user from the previous device
        existingAssignment.user_uid = null;
        await this.devicesRepository.save(existingAssignment);
        console.log(
          `Removed user ${userId} from device ${existingAssignment.device_uid}`,
        );
      }

      return existingAssignment ? existingAssignment.device_uid : null;
    } catch (error) {
      console.error('Error in validateUserIdLinked:', error);
      throw new Error('Failed to validate user device link');
    }
  }
  async getDeviceAssignmentSummary(organizationId: string): Promise<{
    totalDevices: number;
    assignedDevices: number;
    unassignedDevices: number;
    totalUsers: number;
    devicesPerUser: { [userId: string]: number };
  }> {
    try {
      const [devices, users] = await Promise.all([
        this.findAllDevices(organizationId),
        this.findAllUsers(organizationId),
      ]);

      const assignedDevices = devices.filter((device) => device.user_uid);
      const unassignedDevices = devices.filter((device) => !device.user_uid);

      // Count devices per user
      const devicesPerUser: { [userId: string]: number } = {};
      assignedDevices.forEach((device) => {
        if (device.user_uid) {
          devicesPerUser[device.user_uid] =
            (devicesPerUser[device.user_uid] || 0) + 1;
        }
      });

      return {
        totalDevices: devices.length,
        assignedDevices: assignedDevices.length,
        unassignedDevices: unassignedDevices.length,
        totalUsers: users.length,
        devicesPerUser,
      };
    } catch (error) {
      console.error('Error getting device assignment summary:', error);
      throw new Error('Failed to get device assignment summary');
    }
  }

  // Add method to validate device assignment
  async validateDeviceAssignment(
    deviceId: string,
    userId: string,
    organizationId: string,
  ): Promise<{
    isValid: boolean;
    message: string;
    device?: Devices;
    user?: User;
  }> {
    try {
      // Validate device exists and belongs to organization
      const device = await this.devicesRepository.findOne({
        where: {
          device_uid: deviceId,
          organization_uid: organizationId,
        },
      });

      if (!device) {
        return {
          isValid: false,
          message: 'Device not found or does not belong to this organization',
        };
      }

      // Validate user exists and belongs to organization
      const user = await this.userRepository.findOne({
        where: {
          userUUID: userId,
          organizationId: organizationId,
        },
        relations: ['team'],
      });

      if (!user) {
        return {
          isValid: false,
          message: 'User not found or does not belong to this organization',
        };
      }

      return {
        isValid: true,
        message: 'Valid assignment',
        device,
        user,
      };
    } catch (error) {
      console.error('Error validating device assignment:', error);
      return {
        isValid: false,
        message: 'Error validating assignment',
      };
    }
  }

  async updateUserEmail(userId: string, newEmail: string): Promise<boolean> {
    try {
      console.log(`Updating email for user ${userId} to ${newEmail}`);

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        console.error('Invalid email format:', newEmail);
        return false;
      }

      // Check if email is already in use by another user
      const existingUser = await this.userRepository.findOne({
        where: { email: newEmail },
      });

      if (existingUser && existingUser.userUUID !== userId) {
        console.error('Email already in use by another user:', newEmail);
        return false;
      }

      // Update user email
      const updateResult = await this.userRepository.update(
        { userUUID: userId },
        { email: newEmail },
      );

      if (updateResult.affected && updateResult.affected > 0) {
        console.log(
          `Successfully updated email for user ${userId} to ${newEmail}`,
        );
        return true;
      }

      console.log('No rows affected during email update');
      return false;
    } catch (error) {
      console.error('Error updating user email:', error);
      return false;
    }
  }
  async getProductivityData(
    organizationId: string,
    date: string,
  ): Promise<any> {
    try {
      const response = await axios.get(`${this.flaskBaseApiUrl}?date=${date}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        params: {
          organization_uid: organizationId,
          date: date,
        },
      });
      console.log('flask_data: ' + response.data);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch data from Flask API: ${error.message}`);
    }
  }

  async getWeeklyAttendance(
    organizationId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<AttendanceDto[]> {
    const calculatedLogic = await this.calculatedLogicRepository.findOne({
      where: { organization_id: organizationId },
    });

    console.log('calculatedLogic', calculatedLogic);

    if (!calculatedLogic) {
      throw new NotFoundException(
        'CalculatedLogic not found for the organization',
      );
    }
    console.log(organizationId);
    const devices = await this.devicesRepository.find({
      where: { organization_uid: organizationId },
    });
    console.log('devices', devices);
    const attendanceData: AttendanceDto[] = [];

    for (const device of devices) {
      const userActivities = await this.userActivityRepository.find({
        where: {
          timestamp: Between(fromDate, toDate),
          user_uid: device.device_uid,
        },
        order: { timestamp: 'ASC' },
      });
      console.log('userActivities', userActivities);

      const recordsOfWeek: any[] = [];
      const days = this.getDateRange(fromDate, toDate);
      let totalHolidays = 0; // Track holidays

      for (const day of days) {
        const activitiesOfDay = userActivities.filter(
          (activity) =>
            activity.timestamp >= day.start && activity.timestamp <= day.end,
        );

        let status = 'absent';
        console.log(activitiesOfDay.length);

        if (activitiesOfDay.length > 0) {
          const firstActivity = activitiesOfDay[0];
          const lastActivity = activitiesOfDay[activitiesOfDay.length - 1];
          const workDuration =
            (lastActivity.timestamp.getTime() -
              firstActivity.timestamp.getTime()) /
            (1000 * 60 * 60);

          console.log('workDuration: ' + workDuration);
          console.log(
            'fullDayActiveTime for the organization: ' +
              calculatedLogic?.full_day_active_time,
          );
          console.log(
            'HalfDayActiveTime for the organization:: ' +
              calculatedLogic?.half_day_active_time,
          );

          if (workDuration >= calculatedLogic.full_day_active_time) {
            status = 'fullDay';
          } else if (
            workDuration < calculatedLogic.full_day_active_time &&
            workDuration >= calculatedLogic.half_day_active_time
          ) {
            status = 'halfDay';
          }
        } else {
          const isHoliday = this.isHoliday(day.start);
          if (isHoliday) {
            status = 'holiday';
            totalHolidays++; // Increment holiday counter
          }
        }

        const dateString = day.start.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
        });
        recordsOfWeek.push({
          Date: dateString,
          DateStatus: status,
        });
      }

      // Calculate total work days correctly: total days - holidays
      const totalDays = days.length;
      const actualWorkDays = totalDays - totalHolidays;

      const attendanceDto: AttendanceDto = {
        device_id: device.device_uid,
        user_name: device.user_name,
        user_id: device.user_uid,
        totalworkdays: actualWorkDays, // Fixed calculation
        holiday: totalHolidays, // Use calculated holidays
        recordsofWeek: recordsOfWeek,
      };

      attendanceData.push(attendanceDto);
    }

    return attendanceData;
  }

  private getDateRange(
    startDate: Date,
    endDate: Date,
  ): { start: Date; end: Date }[] {
    const dateRange: { start: Date; end: Date }[] = [];
    let currentDate = new Date(startDate);

    while (currentDate < endDate) {
      const start = new Date(currentDate);
      const end = new Date(currentDate);
      end.setHours(23, 59, 59, 999);

      dateRange.push({ start, end });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dateRange;
  }

  private isHoliday(date: Date): boolean {
    // Assuming Saturday (6) and Sunday (0) as holidays
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  async getCalculatedLogicByOrganization(
    organizationId: string,
  ): Promise<CalculatedLogic> {
    return this.calculatedLogicRepository.findOne({
      where: { organization_id: organizationId },
    });
  }

  async createPolicy(createPolicyDto: TrackingPolicyDTO): Promise<Policy> {
    const { organizationId, policyName, screenshotInterval, teamId } =
      createPolicyDto;

    try {
      // Step 1: Validate and fetch related entities
      const organization = await this.organizationRepository.findOne({
        where: { id: organizationId },
      });
      if (!organization) {
        throw new NotFoundException(
          `Organization with ID ${organizationId} not found`,
        );
      }

      const team = await this.teamRepository.findOne({ where: { id: teamId } });
      if (!team) {
        throw new NotFoundException(`Team with ID ${teamId} not found`);
      }

      const users = await this.userRepository.find({
        where: { teamId: team.id },
      });
      // if (users.length === 0) {
      //   throw new NotFoundException(`No users found for team ID ${teamId}`);
      // }

      // Step 2: Create the policy
      const policy = this.policyRepository.create({
        policyName,
        screenshotInterval,
        organization,
      });
      await this.policyRepository.save(policy);

      // Step 3: Assign team and users to the policy
      const teamCreate = this.PolicyTeamRepository.create({
        policy: policy,
        team: team,
      });
      await this.PolicyTeamRepository.save(teamCreate);

      if (users?.length) {
        const policyUsers = users?.map((user) => ({
          policy,
          user,
        }));
        await this.PolicyUserRepository.save(policyUsers);
      }

      // Step 4: Create related settings
      const screenShotsSettings = this.ScreenshotSetRepository.create({
        policy,
        blurScreenshotsStatus: false,
        monitoringStatus: true,
        organization_id: policy?.organization?.id,
        time_interval: 2,
      });
      await this.ScreenshotSetRepository.save(screenShotsSettings);

      const holidays = holidayList.map((holiday) => ({
        holiday_date: holiday?.date,
        holiday_name: holiday.dayName,
        day_status: true,
        holidayDate: holiday.date,
        policy,
      }));
      await this.TrackHolidaysRepository.save(holidays);

      const weekdays = weekdayData.map((day) => ({
        policy,
        day_uuid: day.day_uuid,
        day_name: day.day_name,
        day_status: day.day_status,
        checkIn: this.convertTimeToMinutes(day.checkIn),
        checkOut: this.convertTimeToMinutes(day.checkOut),
        break_start: this.convertTimeToMinutes(day.break_start),
        break_end: this.convertTimeToMinutes(day.break_end),
      }));
      await this.TrackWeedaysRepository.save(weekdays);

      // Step 5: Return the complete policy with relations
      return await this.policyRepository.findOne({
        where: { policyId: policy?.policyId },
        relations: [
          'assignedTeams',
          'assignedUsers',
          'ScreenshotSettings',
          'holidays',
          'weekdays',
        ],
      });
    } catch (error) {
      // Handle any errors
      throw new BadRequestException(
        `Failed to create policy: ${error.message}`,
      );
    }
  }

  convertTimeToMinutes(time: number): number {
    const hours = Math.floor(time / 100); // Extract hours (HH part)
    const minutes = time % 100; // Extract minutes (MM part)
    return hours * 60 + minutes; // Convert to total minutes
  }

  async getDetailsForPolicy(policies: Policy[]) {
    if (!policies.length) {
      return policies;
    }

    const updatedPolicies = await Promise.all(
      policies.map(async (pol) => {
        pol['team'] = 0;
        pol['user'] = 0;
        pol['trackedHolidays'] = holidayList.length || 8;
        pol['trackedWeekdays'] = weekdayData.length || 7;
        pol['productivityItems'] = '46';
        pol['screenshotInterval'] = 1;

        // Get team and user count for each policy
        const team = await this.PolicyTeamRepository.find({
          where: {
            policy: { policyId: pol?.policyId },
            team: Not(IsNull()), // Only include records where the team is not null
          },
          relations: ['team'],
        });
        // console.log(team)
        const user = await this.PolicyUserRepository.find({
          where: {
            policy: { policyId: pol.policyId },
            user: Not(IsNull()), // Only include records where the user is not null
          },
          relations: ['user'], // Ensure user details are loaded
        });

        const screenshotTiming = await this.ScreenshotSetRepository.findOne({
          where: { policy: { policyId: pol?.policyId } },
        });

        const trackWeekDays = await this.TrackWeedaysRepository.find({
          where: { policy: { policyId: pol?.policyId } },
        });

        const trackHoliDays = await this.TrackHolidaysRepository.find({
          where: { policy: { policyId: pol?.policyId } },
        });

        console.log('team', team);
        console.log('trackWeekdays', trackWeekDays?.length);
        console.log('trackHolidays', trackHoliDays?.length);
        console.log('teamLength', team?.length);
        console.log('userLength', user?.length);
        console.log('screenshotInterval', screenshotTiming?.time_interval);

        // Update the policy object with the fetched data
        pol['team'] = team?.length;
        pol['user'] = user?.length;
        pol['trackedHolidays'] = trackHoliDays?.length;
        pol['trackedWeekdays'] = trackWeekDays?.length;
        pol['screenshotInterval'] = screenshotTiming?.time_interval || 1;

        return pol;
      }),
    );

    return updatedPolicies;
  }

  // Update a policy
  async updatePolicy(
    id: string,
    updatePolicyDto: TrackingPolicyDTO,
  ): Promise<Policy> {
    const policy = await this.policyRepository.findOne({
      where: { policyId: id },
    });
    if (!policy) {
      throw new NotFoundException(`Policy with ID ${id} not found`);
    }

    const { policyName, screenshotInterval } = updatePolicyDto;

    policy.policyName = policyName ?? policy.policyName;
    policy.screenshotInterval = screenshotInterval ?? policy.screenshotInterval;
    // policy.isDefault = isDefault ?? policy.isDefault;
    // policy.policyContent = policyContent ?? policy.policyContent;

    await this.policyRepository.save(policy);
    return policy;
  }

  // Fetch all policies for an organization
  async getPoliciesForOrganization(organizationId: string): Promise<Policy[]> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    console.log(organization);
    if (!organization) {
      throw new NotFoundException(
        `Organization with ID ${organizationId} not found`,
      );
    }

    return await this.policyRepository.find({
      where: { organization: { id: organization?.id } },
      // relations: ['assignedTeams', 'assignedUsers'],
    });
  }

  // Fetch a single policy
  async getPolicyById(policyId: string) {
    const policy = await this.policyRepository.findOne({
      where: { policyId },
    });
    if (!policy) {
      throw new NotFoundException(`Policy with ID ${policyId} not found`);
    }
    // policy['team'] = 0;
    // pol['user'] = 0;
    policy['trackedHolidays'] = [];
    policy['trackedWeekdays'] = [];
    policy['productivityItems'] = '46';
    policy['screenshotInterval'] = 1;
    policy['ScreenshotSettings'] = null;
    policy['assignedUsers'] = [];
    policy['assignedTeams'] = [];

    // Get team and user  count for each policy
    // const team = await this.PolicyTeamRepository.findOne({ where: { policy: { policyId: pol?.policyId } } });
    // const user = await this.PolicyUserRepository.findOne({ where: { policy: { policyId: pol?.policyId } } });
    const screenshotTiming = await this.ScreenshotSetRepository.findOne({
      where: { policy: { policyId: policy?.policyId } },
    });
    const trackWeekDays = await this.TrackWeedaysRepository.find({
      where: { policy: { policyId: policy?.policyId } },
    });

    const trackHoliDays = await this.TrackHolidaysRepository.find({
      where: { policy: { policyId: policy?.policyId } },
    });

    const assingUser = await this.PolicyUserRepository.find({
      where: { policy: { policyId: policy?.policyId } },
    });
    const assignTeam = await this.PolicyTeamRepository.find({
      where: { policy: { policyId: policy?.policyId } },
    });

    // const ScreenShotSettings = await this.ScreenshotSetRepository.findOne({where:{policy:{policyId:policy?.policyId}}})
    // console.log(ScreenShotSettings)
    console.log(trackWeekDays?.length);
    console.log(trackHoliDays?.length);
    // Update the policy object with the fetched data
    // policy['team'] = team.length;
    // pol['user'] = user.length;
    policy['trackedHolidays'] = trackHoliDays;
    policy['ScreenshotSettings'] = screenshotTiming;
    policy['trackedWeekdays'] = trackWeekDays;
    policy['screenshotInterval'] = screenshotTiming?.time_interval || 2;
    policy['assignedTeams'] = assignTeam;
    policy['assignedUsers'] = assingUser;

    return policy;
  }
  async getPolicyTeamAndUser(policyId: string): Promise<Policy> {
    console.log('Policy_id', policyId);
    const policy = await this.policyRepository.findOne({
      where: { policyId },
      relations: [
        'assignedTeams', // Loads PolicyTeams entities
        'assignedTeams.team', // Loads Team data within each PolicyTeam
        'assignedUsers', // Loads PolicyUsers entities
        'assignedUsers.user', // Loads User data within each PolicyUser
      ],
    });
    console.log('Policy', policy);

    // let policyTeam = await this.PolicyTeamRepository.find({
    //   where:{policy:{policyId:policy?.policyId},
    // }});
    // const user = await this.PolicyUserRepository.find({where:{policy:{policyId:policy?.policyId}}});

    // policy["assignedUsers"] = user;
    // console.log(user)
    // policy["assignedUsers"] = user;
    // policy["assignedTeams"] = policyTeam;
    return policy;
  }

  async getUserPolicyData(organId: string, userId: string): Promise<Policy[]> {
    // let policy = await this.policyRepository.find({where:{organization:{id:organId}}});
    console.log(organId, userId);
    let policyUsersList = await this.policyRepository.find({
      where: { organization: { id: organId } },
      relations: ['assignedUsers'],
    });
    console.log('policyUsersList', policyUsersList);
    return policyUsersList;
    // return policyUsersList;
  }
  async finalResponseData(
    userConfig: TrackTimeStatus,
    device: string,
    organizationId: string,
  ) {
    let isPaidStatus = await this.SubscriptionRepository.findOne({
      where: { organization_id: organizationId },
    });
    if (!isPaidStatus?.organization_id) {
      return false;
    }
    return true;
  }

  async duplicatePolicy(
    policyId: string,
    name: string,
    teamId: string,
  ): Promise<Policy> {
    console.log(policyId);
    const policyExist = await this.policyRepository.findOne({
      where: { policyId: policyId },
    });
    if (!policyExist) {
      return null;
    }
    console.log('policyExist', policyExist);
    const team = await this.PolicyTeamRepository.find({
      where: { policy: { policyId: policyExist?.policyId } },
    });

    console.log(team);
    const teamExist = team?.length ? team?.find((te) => te.id === teamId) : '';

    const newTeam = await this.teamRepository.findOne({
      where: { id: teamId },
    });

    if (teamId && newTeam && !teamExist) {
      // team = [...team, newTeam];
      const createPolicyTeam = this.PolicyTeamRepository.create({
        policy: { policyId: policyExist?.policyId },
        team: newTeam,
      });
      await this.PolicyTeamRepository.save(createPolicyTeam);
    }
    const weekdays = await this.TrackWeedaysRepository.find({
      where: { policy: { policyId: policyExist?.policyId } },
    });
    const holiday = await this.TrackHolidaysRepository.find({
      where: { policy: { policyId: policyExist?.policyId } },
    });
    const screenshot_settings = await this.ScreenshotSetRepository.findOne({
      where: { policy: { policyId: policyExist?.policyId } },
    });
    const policy_users = await this.PolicyUserRepository.find({
      where: { policy: { policyId: policyExist?.policyId } },
    });

    console.log(weekdays, policy_users);

    const newPolicyName = `${policyExist?.policyName}(copy)`;

    const newPolicy = this.policyRepository.create({
      policyName: name || newPolicyName,
      assignedTeams: team,
      assignedUsers: policy_users,
      organization: policyExist.organization,
      screenshotInterval: screenshot_settings.time_interval,
      weekdays: weekdays,
      holidays: holiday,
      ScreenshotSettings: screenshot_settings,
    });

    await this.policyRepository.save(newPolicy);
    console.log(newPolicy);
    return newPolicy;
  }
  async updatePolicyUserAndTeam(
    policyId: string,
    teamId: string,
    userId: string,
  ) {
    const isPolicyExist = await this.policyRepository.findOne({
      where: { policyId: policyId },
    });
    if (!isPolicyExist) {
      throw new NotFoundException(
        `policy doesn't exist for  policy ${policyId}.`,
      );
    }
    const isteamExist = await this.teamRepository.findOne({
      where: { id: teamId },
    });
    if (!isteamExist) {
      throw new NotFoundException(`team does't exist for  policy ${policyId}.`);
    }
    const isUserExist = await this.userRepository.findOne({
      where: { userUUID: userId },
    });
    if (userId && !isUserExist) {
      throw new NotFoundException(
        `User doesn't exist for  policy ${policyId}.`,
      );
    }

    const teamInPolicyExist = await this.PolicyTeamRepository.findOne({
      where: { team: { id: isteamExist?.id } },
      relations: ['team'],
    });
    console.log('teamInPolicyExist', teamInPolicyExist);

    if (teamInPolicyExist && teamInPolicyExist?.team) {
      return isPolicyExist;
    }

    const team = this.PolicyTeamRepository.create({
      policy: { policyId: isPolicyExist?.policyId },
      team: { id: isteamExist?.id },
    });

    await this.PolicyTeamRepository.save(team);

    const userInPolicyiExist = await this.PolicyUserRepository.findOne({
      where: { user: { userUUID: isUserExist?.userUUID } },
      relations: ['user'],
    });

    console.log('userInPolicyiExist', userInPolicyiExist);

    if (userInPolicyiExist && userInPolicyiExist?.user) {
      return isPolicyExist;
    }
    const user = this.PolicyUserRepository.create({
      policy: { policyId: isPolicyExist?.policyId },
      user: { userUUID: isUserExist?.userUUID },
    });

    await this.PolicyUserRepository.save(user);
    return isPolicyExist;
  }
  async updateScreenShotSettings(
    policyId: string,
    screenshot_id: string,
    blurScreenshotsStatus: boolean,
    time_interval: number,
    screenshot_monitoring: boolean,
  ): Promise<ScreenshotSettings> {
    const policy = await this.policyRepository.findOne({
      where: { policyId: policyId },
      relations: ['ScreenshotSettings'],
    });
    console.log(policy);
    if (!policy?.policyId) {
      throw new NotFoundException(`Policy with ID ${policyId} not found.`);
    }
    // const screenshotSeetings = await this.ScreenshotSetRepository.findOne({where:{policy:{policyId:policy?.policyId}},relations:["policy"]});
    const screenshotSeetings = await this.ScreenshotSetRepository.findOne({
      where: { organization_id: policy?.organization?.id },
      relations: ['policy'],
    });
    // let newScreenshotSetings = await
    (screenshotSeetings.blurScreenshotsStatus = blurScreenshotsStatus),
      (screenshotSeetings.time_interval = time_interval),
      (screenshotSeetings.monitoringStatus = screenshot_monitoring),
      await this.ScreenshotSetRepository.save(screenshotSeetings);

    console.log('screenshotSeetings', screenshotSeetings);
    console.log('policy', policy);

    return screenshotSeetings;
  }
  async deletePolicy(policyId: string) {
    // Step 1: Find the policy to ensure it exists
    const policy = await this.policyRepository.findOne({ where: { policyId } });

    if (!policy) {
      throw new NotFoundException(`Policy with ID ${policyId} not found.`);
    }
    this.logger.log('policy name: ' + policy?.policyName);
    // Deleting ScreenshotSettings related to the policy
    await this.ScreenshotSetRepository.delete({ policy: { policyId } });

    // Deleting Tracked Weekdays related to the policy
    await this.TrackWeedaysRepository.delete({ policy: { policyId } });

    // Deleting Tracked Holidays related to the policy
    await this.TrackHolidaysRepository.delete({ policy: { policyId } });

    // Deleting PolicyUsers (if applicable)
    await this.PolicyUserRepository.delete({ policy: { policyId } });

    // Deleting PolicyTeams (if applicable)
    await this.PolicyTeamRepository.delete({ policy: { policyId } });

    // Step 3: Finally delete the policy itself
    await this.policyRepository.delete({ policyId });
  }

  async findTimeForPaidUsers(deviceId: string): Promise<number> {
    // Find the user associated with the device
    const userDevice = await this.devicesRepository.findOne({
      where: { device_uid: deviceId },
    });

    if (!userDevice) {
      // If no user is found, return the default interval (e.g., 2)
      return 2;
    }

    // Find the PolicyUser relation that includes the policy
    const policyUser = await this.PolicyUserRepository.findOne({
      where: { user: { userUUID: userDevice?.user_uid } },
      relations: ['policy'], // Load the policy relation
    });

    if (!policyUser || !policyUser.policy) {
      // If no policy is found, return the default interval (e.g., 2)
      return 2;
    }

    // Fetch the policy details, specifically the screenshot interval
    const screenshotInterval = await this.ScreenshotSetRepository.findOne({
      where: { policy: { policyId: policyUser?.policy?.policyId } },
    });

    // Return the screenshot interval if found; otherwise, default to 2
    return screenshotInterval?.time_interval || 2;
  }
  async findBlurScreenshotStatus(deviceId: string): Promise<boolean> {
    const userDevice = await this.devicesRepository.findOne({
      where: { device_uid: deviceId },
    });
    console.log('device', userDevice);
    if (!userDevice) {
      // If no user is found, return the default interval (e.g., 2)
      return false;
    }

    // Find the PolicyUser relation that includes the policy
    const policyUser = await this.PolicyUserRepository.findOne({
      where: { user: { userUUID: userDevice?.user_uid } },
      relations: ['policy'], // Load the policy relation
    });
    console.log('policyUser', policyUser);

    if (!policyUser || !policyUser.policy) {
      // If no policy is found, return the default interval (e.g., 2)
      return true;
    }
 
    // Fetch the policy details, specifically the screenshot interval
    const screenshotInterval = await this.ScreenshotSetRepository.findOne({
      where: { policy: { policyId: policyUser?.policy?.policyId } },
    });
    console.log('Screenshot', screenshotInterval);

    return screenshotInterval?.blurScreenshotsStatus || false;
  }
}
 