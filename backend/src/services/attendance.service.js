/**
 * Service to calculate working hours and OT based on check-in and check-out times.
 */

const calculateHours = (checkIn, checkOut, status) => {
  if (status === 'Absent' || status === 'Leave' || status === 'Holiday') {
    return { workingHours: 0, otHours: 0 };
  }

  if (status === 'Half Day') {
    return { workingHours: 4, otHours: 0 };
  }

  if (!checkIn || !checkOut) {
    // If present but no specific times provided, default to 8 hours
    return { workingHours: 8, otHours: 0 };
  }

  // Parse times (assuming format HH:mm or HH:mm:ss)
  const [inHours, inMinutes] = checkIn.split(':').map(Number);
  const [outHours, outMinutes] = checkOut.split(':').map(Number);

  let totalMinutes = (outHours * 60 + outMinutes) - (inHours * 60 + inMinutes);
  
  if (totalMinutes < 0) {
    // Crosses midnight, e.g., 22:00 to 06:00
    totalMinutes += 24 * 60;
  }

  // Calculate total decimal hours
  const totalHours = totalMinutes / 60;
  
  // Standard working hours limit is 8 hours
  const standardHours = 8;
  
  let workingHours = 0;
  let otHours = 0;

  if (totalHours > standardHours) {
    workingHours = standardHours;
    otHours = Number((totalHours - standardHours).toFixed(2));
  } else {
    workingHours = Number(totalHours.toFixed(2));
    otHours = 0;
  }

  return { workingHours, otHours };
};

module.exports = {
  calculateHours
};
