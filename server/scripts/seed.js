require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Company = require('../models/Company');
const Admin = require('../models/Admin');
const Site = require('../models/Site');
const Supervisor = require('../models/Supervisor');
const Shift = require('../models/Shift');
const Guard = require('../models/Guard');
const ShiftAssignment = require('../models/ShiftAssignment');
const AttendanceRecord = require('../models/AttendanceRecord');
const CallLog = require('../models/CallLog');
const Notification = require('../models/Notification');

async function seedDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/guardconnect';
  console.log(`[Seeder] Connecting to MongoDB: ${uri}`);

  try {
    await mongoose.connect(uri);
    console.log('[Seeder] Connected to MongoDB.');

    // Clear existing data for clean seed
    await Promise.all([
      Company.deleteMany({}),
      Admin.deleteMany({}),
      Site.deleteMany({}),
      Supervisor.deleteMany({}),
      Shift.deleteMany({}),
      Guard.deleteMany({}),
      ShiftAssignment.deleteMany({}),
      AttendanceRecord.deleteMany({}),
      CallLog.deleteMany({}),
      Notification.deleteMany({}),
    ]);
    console.log('[Seeder] Cleared previous collections.');

    // 1. Company 1: SecureShield Solutions Pvt Ltd
    const company = await Company.create({
      name: 'SecureShield Solutions Pvt Ltd',
      code: 'SECURESHIELD',
      email: 'operations@secureshield.in',
      phone: '+91 98765 43210',
      address: 'Tower 4, DLF Cyber City, Phase 2',
      city: 'Gurugram',
      state: 'Haryana',
      pincode: '122002',
      status: 'active',
      isActive: true,
      settings: {
        timezone: 'Asia/Kolkata',
        dateFormat: 'DD/MM/YYYY',
        verificationIntervalMinutes: 30,
        retryIntervalMinutes: 5,
        maxRetryAttempts: 2,
        automatedVoiceMessage:
          'Hello. This is GuardConnect Security Monitoring System. Your duty attendance verification is in progress. Press 1 to confirm that you are currently on duty. Press 2 if you need assistance.',
        supervisorAlerts: true,
        missedCallAlerts: true,
        assistanceAlerts: true,
        plivoCallerId: '+919876543210',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      },
    });

    // 2. Level 1: Platform Head Admin / Super Admin (No single company binding)
    const headAdmin = await Admin.create({
      fullName: 'Vikrant Malhotra (Head Admin)',
      email: 'headadmin@autoguard.com',
      aliasEmail: 'vikrant@autoguardsecurity.com',
      password: 'Admin@AutoGuard2026',
      phone: '+91 98110 98110',
      role: 'super_admin',
      isActive: true,
      companyId: null,
    });

    // 3. Level 2: Company 1 Owner & Admin
    const company1Owner = await Admin.create({
      companyId: company._id,
      fullName: 'Rajiv Mehra',
      email: 'owner@secureshield.in',
      password: 'Owner@SecureShield2026',
      phone: '+91 98110 12345',
      role: 'company_owner',
      isActive: true,
    });
    company.ownerId = company1Owner._id;
    await company.save();

    const admin = await Admin.create({
      companyId: company._id,
      fullName: 'Vikrant Malhotra',
      email: 'admin@guardconnect.io',
      password: 'Admin@GuardConnect2026',
      phone: '+91 98110 98110',
      role: 'admin',
      isActive: true,
    });
    console.log('[Seeder] Created Head Admin: headadmin@autoguard.com');
    console.log('[Seeder] Created Company 1: SecureShield (Owner: owner@secureshield.in, Admin: admin@guardconnect.io)');

    // 4. Company 2: Apex Force Security Services (Demonstrating Multi-Company SaaS Isolation)
    const company2 = await Company.create({
      name: 'Apex Force Security Services',
      code: 'APEXFORCE',
      email: 'contact@apexforce.in',
      phone: '+91 98220 54321',
      address: 'Plot 12, Sector 18',
      city: 'Noida',
      state: 'Uttar Pradesh',
      pincode: '201301',
      status: 'active',
      isActive: true,
    });

    const company2Owner = await Admin.create({
      companyId: company2._id,
      fullName: 'Sanjay Deshmukh',
      email: 'owner@apexforce.in',
      password: 'Owner@ApexForce2026',
      phone: '+91 98220 54321',
      role: 'company_owner',
      isActive: true,
    });
    company2.ownerId = company2Owner._id;
    await company2.save();
    console.log('[Seeder] Created Company 2: Apex Force (Owner: owner@apexforce.in)');

    // 5. Supervisors (Company 1)
    const supervisors = await Supervisor.create([
      {
        companyId: company._id,
        supervisorId: 'GC-SUP-201',
        fullName: 'Rajesh Sharma',
        email: 'rajesh.sharma@secureshield.in',
        mobileNumber: '+91 98230 11223',
        employmentStatus: 'Active',
      },
      {
        companyId: company._id,
        supervisorId: 'GC-SUP-202',
        fullName: 'Vikram Singh Rathore',
        email: 'vikram.singh@secureshield.in',
        mobileNumber: '+91 98230 44556',
        employmentStatus: 'Active',
      },
      {
        companyId: company._id,
        supervisorId: 'GC-SUP-203',
        fullName: 'Anita Nair',
        email: 'anita.nair@secureshield.in',
        mobileNumber: '+91 98230 77889',
        employmentStatus: 'Active',
      },
    ]);

    // 4. Sites
    const sites = await Site.create([
      {
        companyId: company._id,
        siteId: 'GC-SIT-101',
        siteName: 'Cyber City Tech Park - Gate 1 & 2',
        address: 'Sector 25, DLF Phase 2',
        city: 'Gurugram',
        state: 'Haryana',
        contactNumber: '+91 124 4567890',
        assignedSupervisor: supervisors[0]._id,
        guardCapacity: 8,
        status: 'Active',
      },
      {
        companyId: company._id,
        siteId: 'GC-SIT-102',
        siteName: 'Grand Heritage Luxury Mall',
        address: 'MG Road',
        city: 'Gurugram',
        state: 'Haryana',
        contactNumber: '+91 124 4567891',
        assignedSupervisor: supervisors[1]._id,
        guardCapacity: 12,
        status: 'Active',
      },
      {
        companyId: company._id,
        siteId: 'GC-SIT-103',
        siteName: 'DLF Horizon Corporate Towers',
        address: 'Golf Course Road, Sector 43',
        city: 'Gurugram',
        state: 'Haryana',
        contactNumber: '+91 124 4567892',
        assignedSupervisor: supervisors[0]._id,
        guardCapacity: 6,
        status: 'Active',
      },
      {
        companyId: company._id,
        siteId: 'GC-SIT-104',
        siteName: 'Metro Logistics Distribution Hub',
        address: 'Bilaspur Chowk, NH-48',
        city: 'Manesar',
        state: 'Haryana',
        contactNumber: '+91 124 4567893',
        assignedSupervisor: supervisors[2]._id,
        guardCapacity: 10,
        status: 'Active',
      },
    ]);

    // Link supervisors to sites
    await Supervisor.findByIdAndUpdate(supervisors[0]._id, {
      assignedSites: [sites[0]._id, sites[2]._id],
    });
    await Supervisor.findByIdAndUpdate(supervisors[1]._id, {
      assignedSites: [sites[1]._id],
    });
    await Supervisor.findByIdAndUpdate(supervisors[2]._id, {
      assignedSites: [sites[3]._id],
    });

    // 5. Shifts
    const shifts = await Shift.create([
      {
        companyId: company._id,
        shiftId: 'GC-SHF-01',
        shiftName: 'Morning Shift',
        startTime: '06:00',
        endTime: '14:00',
        isOvernight: false,
        verificationIntervalMinutes: 30,
        description: 'First shift covering morning business hours',
      },
      {
        companyId: company._id,
        shiftId: 'GC-SHF-02',
        shiftName: 'Evening Shift',
        startTime: '14:00',
        endTime: '22:00',
        isOvernight: false,
        verificationIntervalMinutes: 30,
        description: 'Second shift covering peak evening hours',
      },
      {
        companyId: company._id,
        shiftId: 'GC-SHF-03',
        shiftName: 'Night Shift',
        startTime: '22:00',
        endTime: '06:00',
        isOvernight: true,
        verificationIntervalMinutes: 30,
        description: 'Overnight shift with strict hourly verification call protocol',
      },
    ]);

    // 6. Guards (Diverse realistic profiles)
    const guardsData = [
      {
        guardId: 'GC-GRD-1001',
        fullName: 'Ramesh Kumar Verma',
        fatherName: 'Ramphal Verma',
        dateOfBirth: new Date('1988-04-12'),
        gender: 'Male',
        mobileNumber: '+91 98101 23456',
        alternateMobileNumber: '+91 98101 23457',
        emergencyContactNumber: '+91 98101 99999',
        residentialAddress: 'House 42, Gali No. 3, Kapashera',
        city: 'New Delhi',
        state: 'Delhi',
        pinCode: '110037',
        employeeId: 'EMP-9001',
        dateOfJoining: new Date('2023-01-15'),
        designation: 'Senior Security Guard',
        assignedSite: sites[0]._id,
        assignedSupervisor: supervisors[0]._id,
        assignedShift: shifts[1]._id, // Evening Shift (currently active around 2:30 PM local)
        employmentStatus: 'Active',
        currentDutyStatus: 'On Duty',
        attendanceStatus: 'Confirmed',
        policeVerificationStatus: 'Verified',
        trainingStatus: 'Completed',
        identityDocType: 'Aadhaar Card',
        identityDocNumber: '4532 9812 7741',
        lastVerificationTime: new Date(Date.now() - 12 * 60 * 1000),
        nextScheduledCall: new Date(Date.now() + 18 * 60 * 1000),
        lastCallResponse: '1 - Confirmed',
      },
      {
        guardId: 'GC-GRD-1002',
        fullName: 'Suresh Chandra Yadav',
        fatherName: 'Moti Lal Yadav',
        dateOfBirth: new Date('1992-08-20'),
        gender: 'Male',
        mobileNumber: '+91 98102 34567',
        emergencyContactNumber: '+91 98102 88888',
        residentialAddress: 'Village Sikanderpur, Near Metro Station',
        city: 'Gurugram',
        state: 'Haryana',
        pinCode: '122002',
        employeeId: 'EMP-9002',
        dateOfJoining: new Date('2023-03-01'),
        designation: 'Security Guard',
        assignedSite: sites[0]._id,
        assignedSupervisor: supervisors[0]._id,
        assignedShift: shifts[1]._id,
        employmentStatus: 'Active',
        currentDutyStatus: 'On Duty',
        attendanceStatus: 'Pending',
        policeVerificationStatus: 'Verified',
        trainingStatus: 'Completed',
        identityDocType: 'Aadhaar Card',
        identityDocNumber: '6741 2289 1045',
        lastVerificationTime: new Date(Date.now() - 32 * 60 * 1000),
        nextScheduledCall: new Date(Date.now() - 2 * 60 * 1000),
        lastCallResponse: 'Calling...',
      },
      {
        guardId: 'GC-GRD-1003',
        fullName: 'Manjeet Singh',
        fatherName: 'Harbhajan Singh',
        dateOfBirth: new Date('1985-11-05'),
        gender: 'Male',
        mobileNumber: '+91 98103 45678',
        residentialAddress: 'Sector 14 Housing Board Colony',
        city: 'Gurugram',
        state: 'Haryana',
        pinCode: '122001',
        employeeId: 'EMP-9003',
        dateOfJoining: new Date('2022-09-10'),
        designation: 'Head Security Guard',
        assignedSite: sites[1]._id,
        assignedSupervisor: supervisors[1]._id,
        assignedShift: shifts[1]._id,
        employmentStatus: 'Active',
        currentDutyStatus: 'On Duty',
        attendanceStatus: 'Assistance Requested',
        policeVerificationStatus: 'Verified',
        trainingStatus: 'Completed',
        identityDocType: 'Voter ID',
        identityDocNumber: 'DLH19827364',
        lastVerificationTime: new Date(Date.now() - 5 * 60 * 1000),
        lastCallResponse: '2 - Assistance Needed',
      },
      {
        guardId: 'GC-GRD-1004',
        fullName: 'Dharmendra Rawat',
        fatherName: 'Bhopal Singh Rawat',
        dateOfBirth: new Date('1994-06-18'),
        gender: 'Male',
        mobileNumber: '+91 98104 56789',
        residentialAddress: 'Flat 102, Shanti Kunj, Dundahera',
        city: 'Gurugram',
        state: 'Haryana',
        pinCode: '122016',
        employeeId: 'EMP-9004',
        dateOfJoining: new Date('2023-06-15'),
        designation: 'Security Guard',
        assignedSite: sites[1]._id,
        assignedSupervisor: supervisors[1]._id,
        assignedShift: shifts[1]._id,
        employmentStatus: 'Active',
        currentDutyStatus: 'On Duty',
        attendanceStatus: 'Missed',
        consecutiveMissedCalls: 1,
        policeVerificationStatus: 'Pending',
        trainingStatus: 'Completed',
        identityDocType: 'Aadhaar Card',
        identityDocNumber: '9901 3412 8876',
        lastVerificationTime: new Date(Date.now() - 4 * 60 * 1000),
        nextScheduledCall: new Date(Date.now() + 1 * 60 * 1000),
        lastCallResponse: 'No Answer',
      },
      {
        guardId: 'GC-GRD-1005',
        fullName: 'Sunita Devi',
        fatherName: 'Om Prakash',
        dateOfBirth: new Date('1990-02-14'),
        gender: 'Female',
        mobileNumber: '+91 98105 67890',
        residentialAddress: 'Gali 2, Jacobpura, Old Railway Road',
        city: 'Gurugram',
        state: 'Haryana',
        pinCode: '122001',
        employeeId: 'EMP-9005',
        dateOfJoining: new Date('2023-08-01'),
        designation: 'Female Security Guard (Mall Checkpoint)',
        assignedSite: sites[1]._id,
        assignedSupervisor: supervisors[1]._id,
        assignedShift: shifts[0]._id, // Morning Shift (completed)
        employmentStatus: 'Active',
        currentDutyStatus: 'Off Duty',
        attendanceStatus: 'Confirmed',
        policeVerificationStatus: 'Verified',
        trainingStatus: 'Completed',
        identityDocType: 'Aadhaar Card',
        identityDocNumber: '8872 1190 3345',
        lastCallResponse: '1 - Confirmed',
      },
      {
        guardId: 'GC-GRD-1006',
        fullName: 'Pradeep Mishra',
        fatherName: 'Ramakant Mishra',
        dateOfBirth: new Date('1987-12-09'),
        gender: 'Male',
        mobileNumber: '+91 98106 78901',
        residentialAddress: 'H-Block, Palam Vihar',
        city: 'Gurugram',
        state: 'Haryana',
        pinCode: '122017',
        employeeId: 'EMP-9006',
        dateOfJoining: new Date('2022-11-20'),
        designation: 'Night Security Guard',
        assignedSite: sites[2]._id,
        assignedSupervisor: supervisors[0]._id,
        assignedShift: shifts[2]._id, // Night Shift
        employmentStatus: 'Active',
        currentDutyStatus: 'Off Duty',
        attendanceStatus: 'Not Started',
        policeVerificationStatus: 'Verified',
        trainingStatus: 'Completed',
        identityDocType: 'Aadhaar Card',
        identityDocNumber: '3341 5567 8890',
      },
      {
        guardId: 'GC-GRD-1007',
        fullName: 'Vikram Bhati',
        fatherName: 'Kartar Bhati',
        dateOfBirth: new Date('1993-05-27'),
        gender: 'Male',
        mobileNumber: '+91 98107 89012',
        residentialAddress: 'Near IMT Manesar Main Chowk',
        city: 'Manesar',
        state: 'Haryana',
        pinCode: '122051',
        employeeId: 'EMP-9007',
        dateOfJoining: new Date('2023-10-05'),
        designation: 'Gate Security Guard',
        assignedSite: sites[3]._id,
        assignedSupervisor: supervisors[2]._id,
        assignedShift: shifts[1]._id,
        employmentStatus: 'Active',
        currentDutyStatus: 'On Duty',
        attendanceStatus: 'Confirmed',
        policeVerificationStatus: 'Verified',
        trainingStatus: 'Completed',
        identityDocType: 'Aadhaar Card',
        identityDocNumber: '7823 4410 9901',
        lastVerificationTime: new Date(Date.now() - 20 * 60 * 1000),
        nextScheduledCall: new Date(Date.now() + 10 * 60 * 1000),
        lastCallResponse: '1 - Confirmed',
      },
    ];

    const guards = [];
    for (const g of guardsData) {
      const guard = await Guard.create({ ...g, companyId: company._id });
      guards.push(guard);

      // Create Shift Assignment
      await ShiftAssignment.create({
        companyId: company._id,
        guardId: guard._id,
        shiftId: guard.assignedShift,
        siteId: guard.assignedSite,
        supervisorId: guard.assignedSupervisor,
        startDate: new Date(),
        status: 'Active',
        assignedBy: admin._id,
      });
    }

    // 7. Seed Call Logs & Attendance Records for realistic analytics
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();

    // Call log 1: Confirmed
    const callLog1 = await CallLog.create({
      companyId: company._id,
      guardId: guards[0]._id,
      shiftId: shifts[1]._id,
      siteId: sites[0]._id,
      supervisorId: supervisors[0]._id,
      callId: `GC-CALL-${Date.now()}-101`,
      callDirection: 'Outbound',
      callerNumber: company.settings.plivoCallerId,
      destinationNumber: guards[0].mobileNumber,
      callStatus: 'Completed',
      dtmfResponse: '1',
      verificationResult: 'CONFIRMED',
      initiationTime: new Date(now.getTime() - 15 * 60 * 1000),
      answerTime: new Date(now.getTime() - 14 * 60 * 1000),
      endTime: new Date(now.getTime() - 14 * 60 * 1000 + 22000),
      durationSeconds: 22,
      retryAttempt: 0,
      isSimulated: true,
      notes: 'Attendance confirmed via DTMF keypad input 1.',
    });

    // Call log 2: Assistance
    const callLog2 = await CallLog.create({
      companyId: company._id,
      guardId: guards[2]._id,
      shiftId: shifts[1]._id,
      siteId: sites[1]._id,
      supervisorId: supervisors[1]._id,
      callId: `GC-CALL-${Date.now()}-102`,
      callDirection: 'Outbound',
      callerNumber: company.settings.plivoCallerId,
      destinationNumber: guards[2].mobileNumber,
      callStatus: 'Completed',
      dtmfResponse: '2',
      verificationResult: 'ASSISTANCE_REQUESTED',
      initiationTime: new Date(now.getTime() - 8 * 60 * 1000),
      answerTime: new Date(now.getTime() - 7 * 60 * 1000),
      endTime: new Date(now.getTime() - 7 * 60 * 1000 + 19000),
      durationSeconds: 19,
      retryAttempt: 0,
      isSimulated: true,
      notes: 'Guard pressed 2 for supervisor assistance.',
    });

    // Call log 3: Missed
    const callLog3 = await CallLog.create({
      companyId: company._id,
      guardId: guards[3]._id,
      shiftId: shifts[1]._id,
      siteId: sites[1]._id,
      supervisorId: supervisors[1]._id,
      callId: `GC-CALL-${Date.now()}-103`,
      callDirection: 'Outbound',
      callerNumber: company.settings.plivoCallerId,
      destinationNumber: guards[3].mobileNumber,
      callStatus: 'No Answer',
      dtmfResponse: null,
      verificationResult: 'MISSED',
      initiationTime: new Date(now.getTime() - 5 * 60 * 1000),
      endTime: new Date(now.getTime() - 4 * 60 * 1000),
      durationSeconds: 0,
      retryAttempt: 0,
      isSimulated: true,
      notes: 'Verification call missed (Attempt #1). Retry scheduled in 5 mins.',
    });

    // Attendance Records
    await AttendanceRecord.create({
      companyId: company._id,
      guardId: guards[0]._id,
      shiftId: shifts[1]._id,
      siteId: sites[0]._id,
      date: todayStr,
      dutyStatus: 'Present',
      firstVerificationTime: new Date(now.getTime() - 60 * 60 * 1000),
      lastVerificationTime: new Date(now.getTime() - 14 * 60 * 1000),
      totalCallsTriggered: 2,
      totalConfirmedCalls: 2,
      totalMissedCalls: 0,
      totalAssistanceRequests: 0,
      verificationLog: [
        {
          callLogId: callLog1._id,
          time: new Date(now.getTime() - 14 * 60 * 1000),
          status: 'CONFIRMED',
          dtmfResponse: '1',
          notes: 'Keypad 1 pressed',
        },
      ],
    });

    await AttendanceRecord.create({
      companyId: company._id,
      guardId: guards[2]._id,
      shiftId: shifts[1]._id,
      siteId: sites[1]._id,
      date: todayStr,
      dutyStatus: 'Assistance Flagged',
      firstVerificationTime: new Date(now.getTime() - 30 * 60 * 1000),
      lastVerificationTime: new Date(now.getTime() - 7 * 60 * 1000),
      totalCallsTriggered: 1,
      totalConfirmedCalls: 0,
      totalMissedCalls: 0,
      totalAssistanceRequests: 1,
      verificationLog: [
        {
          callLogId: callLog2._id,
          time: new Date(now.getTime() - 7 * 60 * 1000),
          status: 'ASSISTANCE_REQUESTED',
          dtmfResponse: '2',
          notes: 'Keypad 2 pressed (Assistance Requested)',
        },
      ],
    });

    // 8. Notifications
    await Notification.create([
      {
        companyId: company._id,
        recipientType: 'All',
        title: 'EMERGENCY / ASSISTANCE: Manjeet Singh (GC-GRD-1003)',
        message: 'Guard Manjeet Singh pressed 2 requesting immediate supervisor assistance at Grand Heritage Luxury Mall. Mobile: +91 98103 45678.',
        type: 'ASSISTANCE_REQUEST',
        severity: 'critical',
        guardId: guards[2]._id,
        siteId: sites[1]._id,
        callLogId: callLog2._id,
        isRead: false,
      },
      {
        companyId: company._id,
        recipientType: 'Admin',
        title: 'Missed Verification Call: Dharmendra Rawat',
        message: 'Guard Dharmendra Rawat did not answer verification call attempt #1 at Grand Heritage Luxury Mall. Retry scheduled.',
        type: 'RETRY_ALERT',
        severity: 'warning',
        guardId: guards[3]._id,
        siteId: sites[1]._id,
        callLogId: callLog3._id,
        isRead: false,
      },
      {
        companyId: company._id,
        recipientType: 'Admin',
        title: 'Evening Shift Initiated',
        message: 'Evening shift (14:00 - 22:00) active across all sites. Automated phone call verification scheduler running.',
        type: 'SHIFT_START',
        severity: 'info',
        isRead: true,
      },
    ]);

    console.log('[Seeder] Database successfully seeded with full production test suite!');
    process.exit(0);
  } catch (error) {
    console.error('[Seeder Error]', error);
    process.exit(1);
  }
}

seedDatabase();
