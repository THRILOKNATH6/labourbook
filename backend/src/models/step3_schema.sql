CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    shift_name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    working_hours DECIMAL(4, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    labour_id UUID REFERENCES labours(id) ON DELETE CASCADE,
    contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
    attendance_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Present', 'Absent', 'Half Day', 'Leave', 'Holiday')),
    check_in TIME,
    check_out TIME,
    working_hours DECIMAL(4, 2) DEFAULT 0,
    ot_hours DECIMAL(4, 2) DEFAULT 0,
    ot_rate DECIMAL(10, 2) DEFAULT 0,
    ot_note TEXT,
    advance_amount DECIMAL(10, 2) DEFAULT 0,
    advance_mode VARCHAR(20) DEFAULT 'Cash',
    advance_transaction_id VARCHAR(100),
    shift_type UUID REFERENCES shifts(id) ON DELETE SET NULL,
    remarks TEXT,
    marked_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(labour_id, attendance_date)
);

CREATE INDEX idx_attendance_project_date ON attendance(project_id, attendance_date);
CREATE INDEX idx_attendance_labour_date ON attendance(labour_id, attendance_date);

CREATE TABLE contractor_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    contractor_id UUID REFERENCES contractors(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    num_of_labours INTEGER DEFAULT 0,
    worked_units DECIMAL(10, 2) DEFAULT 0,
    work_details JSONB,
    created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(contractor_id, attendance_date)
);

CREATE INDEX idx_contractor_attendance_date ON contractor_attendance(project_id, attendance_date);
CREATE INDEX idx_attendance_date ON attendance(attendance_date);
CREATE INDEX idx_attendance_contractor_id ON attendance(contractor_id);
