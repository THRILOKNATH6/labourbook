CREATE TABLE contractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    gst_number VARCHAR(100),
    address TEXT,
    labour_capacity INTEGER,
    contract_type VARCHAR(100),
    commission_type VARCHAR(100),
    unit VARCHAR(100),
    unit_price DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    id_proof_url TEXT,
    agreement_url TEXT,
    bank_name VARCHAR(255),
    account_number VARCHAR(100),
    ifsc_code VARCHAR(50),
    upi_id VARCHAR(100),
    created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE labours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    father_name VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    aadhaar_number VARCHAR(100) UNIQUE,
    address TEXT,
    gender VARCHAR(20),
    dob DATE,
    photo_url TEXT,
    skill_type VARCHAR(100),
    daily_wage DECIMAL(10, 2),
    joining_date DATE,
    work_type VARCHAR(100),
    shift_type VARCHAR(50),
    bank_name VARCHAR(255),
    account_number VARCHAR(100),
    ifsc_code VARCHAR(50),
    upi_id VARCHAR(100),
    payment_preference VARCHAR(50),
    emergency_contact VARCHAR(100),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
    created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contractors_project_id ON contractors(project_id);
CREATE INDEX idx_labours_project_id ON labours(project_id);
CREATE INDEX idx_labours_contractor_id ON labours(contractor_id);
