class BookingBuilder {
  constructor(user, shelter) {
    if (!user || !shelter) {
      throw new Error('User and shelter are required for booking');
    }
    this.booking = {
      id: `booking_${Date.now()}`,
      requesterId: user.uid,
      requesterName: user.displayName || 'Anonymous',
      requesterPhone: 'N/A',
      requesterEmail: user.email || 'N/A',
      shelterId: shelter.id,
      shelterName: shelter.name,
      numberOfPeople: 1,
      urgency: 'medium',
      specialNeeds: [],
      estimatedDuration: 1,
      notes: '',
      status: 'pending',
      createdAt: new Date().toISOString()
    };
  }

  withUserData(userData) {
    if (userData?.displayName) this.booking.requesterName = userData.displayName;
    if (userData?.phone) this.booking.requesterPhone = userData.phone;
    return this;
  }

  withNumberOfPeople(num) {
    const parsed = parseInt(num);
    if (isNaN(parsed) || parsed < 1) {
      throw new Error('Number of people must be a positive integer');
    }
    this.booking.numberOfPeople = parsed;
    return this;
  }

  withUrgency(level) {
    const validUrgencies = ['low', 'medium', 'high', 'critical'];
    if (!validUrgencies.includes(level)) {
      throw new Error('Invalid urgency level');
    }
    this.booking.urgency = level;
    return this;
  }

  withSpecialNeeds(needs) {
    this.booking.specialNeeds = Array.isArray(needs) ? needs : [];
    return this;
  }

  withEstimatedDuration(days) {
    const parsed = parseInt(days);
    if (isNaN(parsed) || parsed < 1 || parsed > 30) {
      throw new Error('Duration must be between 1 and 30 days');
    }
    this.booking.estimatedDuration = parsed;
    return this;
  }

  withNotes(notes) {
    this.booking.notes = notes || '';
    return this;
  }

  build() {
    if (!this.booking.requesterId || !this.booking.shelterId) {
      throw new Error('Booking is missing required fields');
    }
    return { ...this.booking };
  }
}

export default BookingBuilder;