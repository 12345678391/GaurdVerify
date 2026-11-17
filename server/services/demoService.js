const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Company = require('../models/Company');
const Admin = require('../models/Admin');
const Site = require('../models/Site');
const Shift = require('../models/Shift');
const Supervisor = require('../models/Supervisor');
const Guard = require('../models/Guard');
const ShiftAssignment = require('../models/ShiftAssignment');
const AttendanceRecord = require('../models/AttendanceRecord');
const CallLog = require('../models/CallLog');

const DEMO_COMPANY_CODE = 'DEMO-CORP';
const DEMO_ADMIN_EMAIL = 'demo@autoguard.com';

class DemoService {
  /**
   * Ensure the isolated demo workspace (company, admin, and realistic sample data) exists
   * and return a verified session JWT and admin profile.
   */
  async getOrCreateDemoWorkspace() {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not configured.');
    }

    // 1. Find or create the dedicated Demo Company
    let demoCompany = await Company.findOne({ code: DEMO_COMPANY_CODE });
    if (!demoCompany) {
      demoCompany = await Company.create({
        name: 'AutoGuard Demo Security Services',
        code: DEMO_COMPANY_CODE,
        registrationNumber: 'CIN-U74999HR2026PTC099999',
        contactPerson: 'Demo Operations Manager',
        email: DEMO_ADMIN_EMAIL,
        phone: '+91 98000 00000',
        address: 'Demo Business Park, Cyber Tower 1',
        city: 'Gurugram',
        state: 'Haryana',
        pincode: '122002',
        status: 'active',
        isActive: true,
        isDemo: true,
        settings: {
          timezone: 'Asia/Kolkata',
          dateFormat: 'DD/MM/YYYY',
          verificationIntervalMinutes: 30,
          retryIntervalMinutes: 5,
          maxRetryAttempts: 2,
          supervisorAlerts: true,
          missedCallAlerts: true,
          assistanceAlerts: true,
        },
      });
    }

    // 2. Find or create the dedicated Demo Admin Account
    let demoAdmin = await Admin.findOne({ email: DEMO_ADMIN_EMAIL });
    if (!demoAdmin) {
      demoAdmin = await Admin.create({
        companyId: demoCompany._id,
        fullName: 'Demo Administrator (Read-Only)',
        email: DEMO_ADMIN_EMAIL,
        password: 'DemoPassword@AutoGuard2026!',
        phone: '+91 98000 00000',
        role: 'demo_user',
        isActive: true,
        isDemo: true,
        mustChangePassword: false,
      });

      demoCompany.ownerId = demoAdmin._id;
      await demoCompany.save();
    } else {
      // Ensure role and isDemo flags remain strict
      if (demoAdmin.role !== 'demo_user' || !demoAdmin.isDemo) {
        demoAdmin.role = 'demo_user';
        demoAdmin.isDemo = true;
        demoAdmin.isActive = true;
        await demoAdmin.save();
      }
    }

    // 3. Ensure isolated sample sites exist for the demo company
    let site1 = await Site.findOne({ companyId: demoCompany._id, siteId: 'DEMO-STE-101' });
    if (!site1) {
      site1 = await Site.create({
        companyId: demoCompany._id,
        siteId: 'DEMO-STE-101',
        siteName: 'Cyber Gateway Plaza (Demo)',
        address: 'Sector 25, Phase 2, DLF Cyber City',
        city: 'Gurugram',
        state: 'Haryana',
        contactNumber: '+91 98000 00001',
        status: 'Active',
        guardCapacity: 6,
      });
    }

    let site2 = await Site.findOne({ companyId: demoCompany._id, siteId: 'DEMO-STE-102' });
    if (!site2) {
      site2 = await Site.create({
        companyId: demoCompany._id,
        siteId: 'DEMO-STE-102',
        siteName: 'Infinity Business Tower (Demo)',
        address: 'Golf Course Road, Sector 43',
        city: 'Gurugram',
        state: 'Haryana',
        contactNumber: '+91 98000 00002',
        status: 'Active',
        guardCapacity: 4,
      });
    }

    // 4. Ensure isolated sample shifts exist
    let shift1 = await Shift.findOne({ companyId: demoCompany._id, shiftId: 'DEMO-SHF-01' });
    if (!shift1) {
      shift1 = await Shift.create({
        companyId: demoCompany._id,
        shiftId: 'DEMO-SHF-01',
        shiftName: 'Morning Duty Shift (06:00 - 14:00)',
        startTime: '06:00',
        endTime: '14:00',
        isOvernight: false,
        verificationIntervalMinutes: 30,
        description: 'Standard daytime perimeter and access control shift.',
      });
    }

    let shift2 = await Shift.findOne({ companyId: demoCompany._id, shiftId: 'DEMO-SHF-02' });
    if (!shift2) {
      shift2 = await Shift.create({
        companyId: demoCompany._id,
        shiftId: 'DEMO-SHF-02',
        shiftName: 'Night Patrol Shift (22:00 - 06:00)',
        startTime: '22:00',
        endTime: '06:00',
        isOvernight: true,
        verificationIntervalMinutes: 30,
        description: 'Night shift with automated telephony guard verification.',
      });
    }

    // 5. Ensure demo supervisor exists
    let supervisor = await Supervisor.findOne({ companyId: demoCompany._id, supervisorId: 'DEMO-SUP-101' });
    if (!supervisor) {
      supervisor = await Supervisor.create({
        companyId: demoCompany._id,
        supervisorId: 'DEMO-SUP-101',
        fullName: 'Vikramaditya Rao (Demo Supervisor)',
        email: 'supervisor.demo@autoguard.com',
        mobileNumber: '+91 98000 00010',
        assignedSites: [site1._id, site2._id],
        employmentStatus: 'Active',
      });
    }

    // 6. Ensure demo guards exist
    const demoGuardsData = [
      {
        guardId: 'DEMO-GRD-101',
        fullName: 'Rajesh Kumar (Demo Guard)',
        fatherName: 'Ram Kumar',
        mobileNumber: '+91 98000 00021',
        residentialAddress: 'Main Reception Post, Cyber Gateway',
        city: 'Gurugram',
        state: 'Haryana',
        pinCode: '122002',
        designation: 'Senior Security Guard',
        assignedSite: site1._id,
        assignedShift: shift1._id,
        assignedSupervisor: supervisor._id,
        employmentStatus: 'Active',
        currentDutyStatus: 'On Duty',
        attendanceStatus: 'Confirmed',
      },
      {
        guardId: 'DEMO-GRD-102',
        fullName: 'Amit Sharma (Demo Guard)',
        fatherName: 'Mohan Sharma',
        mobileNumber: '+91 98000 00022',
        residentialAddress: 'Tower B Loading Bay, Cyber Gateway',
        city: 'Gurugram',
        state: 'Haryana',
        pinCode: '122002',
        designation: 'Security Guard',
        assignedSite: site1._id,
        assignedShift: shift1._id,
        assignedSupervisor: supervisor._id,
        employmentStatus: 'Active',
        currentDutyStatus: 'On Duty',
        attendanceStatus: 'Pending',
      },
      {
        guardId: 'DEMO-GRD-103',
        fullName: 'Suresh Yadav (Demo Guard)',
        fatherName: 'Hari Yadav',
        mobileNumber: '+91 98000 00023',
        residentialAddress: 'North Perimeter Gate, Infinity Tower',
        city: 'Gurugram',
        state: 'Haryana',
        pinCode: '122002',
        designation: 'Patrol Guard',
        assignedSite: site2._id,
        assignedShift: shift2._id,
        assignedSupervisor: supervisor._id,
        employmentStatus: 'Active',
        currentDutyStatus: 'Off Duty',
        attendanceStatus: 'Not Started',
      },
      {
        guardId: 'DEMO-GRD-104',
        fullName: 'Pooja Verma (Demo Guard)',
        fatherName: 'Dinesh Verma',
        gender: 'Female',
        mobileNumber: '+91 98000 00024',
        residentialAddress: 'Executive Visitor Desk, Infinity Tower',
        city: 'Gurugram',
        state: 'Haryana',
        pinCode: '122002',
        designation: 'Front Desk Security Officer',
        assignedSite: site2._id,
        assignedShift: shift2._id,
        assignedSupervisor: supervisor._id,
        employmentStatus: 'Active',
        currentDutyStatus: 'Off Duty',
        attendanceStatus: 'Not Started',
      },
    ];

    const createdGuards = [];
    for (const gData of demoGuardsData) {
      let guard = await Guard.findOne({ companyId: demoCompany._id, guardId: gData.guardId });
      if (!guard) {
        guard = await Guard.create({
          ...gData,
          companyId: demoCompany._id,
        });

        // Create shift assignment
        await ShiftAssignment.create({
          companyId: demoCompany._id,
          guardId: guard._id,
          shiftId: gData.assignedShift,
          siteId: gData.assignedSite,
          status: 'Active',
        });
      }
      createdGuards.push(guard);
    }

    // 7. Ensure sample attendance record for today exists
    const todayStr = new Date().toISOString().split('T')[0];
    const existingAtt = await AttendanceRecord.findOne({ companyId: demoCompany._id, date: todayStr });
    if (!existingAtt && createdGuards.length > 0) {
      await AttendanceRecord.create({
        companyId: demoCompany._id,
        guardId: createdGuards[0]._id,
        shiftId: shift1._id,
        siteId: site1._id,
        date: todayStr,
        dutyStatus: 'Present',
        totalCallsTriggered: 2,
        totalConfirmedCalls: 2,
        totalMissedCalls: 0,
        totalAssistanceRequests: 0,
        firstVerificationTime: new Date(Date.now() - 3 * 3600 * 1000),
        lastVerificationTime: new Date(),
      });
    }

    // 8. Ensure sample call log exists
    const existingCall = await CallLog.findOne({ companyId: demoCompany._id });
    if (!existingCall && createdGuards.length > 0) {
      await CallLog.create({
        companyId: demoCompany._id,
        guardId: createdGuards[0]._id,
        shiftId: shift1._id,
        siteId: site1._id,
        supervisorId: supervisor._id,
        callId: `CALL-DEMO-${Date.now()}`,
        callDirection: 'Outbound',
        callerNumber: '+919876543210',
        destinationNumber: createdGuards[0].mobileNumber,
        callStatus: 'Completed',
        verificationResult: 'CONFIRMED',
        dtmfResponse: '1',
        durationSeconds: 18,
        initiationTime: new Date(Date.now() - 45 * 60 * 1000),
        notes: 'Keypad [1] — Duty Confirmed (Demo Verification)',
        isSimulated: true,
      });
    }

    // 9. Generate verified JWT token for the demo user
    const token = jwt.sign({ id: demoAdmin._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '7d',
    });

    const adminProfile = {
      id: demoAdmin._id,
      _id: demoAdmin._id,
      fullName: demoAdmin.fullName,
      email: demoAdmin.email,
      role: demoAdmin.role,
      isDemo: true,
      companyId: demoCompany._id,
      company: {
        id: demoCompany._id,
        _id: demoCompany._id,
        name: demoCompany.name,
        code: demoCompany.code,
        email: demoCompany.email,
        phone: demoCompany.phone,
        status: demoCompany.status,
        isDemo: true,
      },
    };

    return {
      token,
      admin: adminProfile,
    };
  }
}

module.exports = new DemoService();
