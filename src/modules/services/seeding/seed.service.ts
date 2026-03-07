// seed-services.ts
export const INITIAL_SERVICES = [
  // Home Maintenance
  { name: 'Plumber', category: 'Home Maintenance', description: 'Pipe fitting, leak repairs, water systems', tags: ['home', 'repair', 'water', 'pipes'] },
  { name: 'Electrician', category: 'Home Maintenance', description: 'Electrical installations and repairs', tags: ['home', 'repair', 'electrical', 'wiring'] },
  { name: 'Carpenter', category: 'Home Maintenance', description: 'Wood work, furniture, doors, windows', tags: ['home', 'repair', 'wood', 'furniture'] },
  { name: 'Painter', category: 'Home Maintenance', description: 'Interior and exterior painting', tags: ['home', 'paint', 'decoration'] },
  { name: 'Tiler', category: 'Home Maintenance', description: 'Floor and wall tiling', tags: ['home', 'tiles', 'flooring'] },
  { name: 'Mason', category: 'Home Maintenance', description: 'Bricklaying and masonry work', tags: ['home', 'construction', 'building'] },
  { name: 'Welder', category: 'Home Maintenance', description: 'Metal fabrication and welding', tags: ['metal', 'fabrication', 'welding'] },
  { name: 'AC Technician', category: 'Home Maintenance', description: 'Air conditioning installation and repair', tags: ['home', 'cooling', 'ac', 'hvac'] },
  { name: 'Solar Installer', category: 'Home Maintenance', description: 'Solar panel installation', tags: ['solar', 'energy', 'renewable'] },
  
  // Automotive
  { name: 'Mechanic', category: 'Automotive', description: 'Vehicle repair and maintenance', tags: ['auto', 'car', 'repair', 'engine'] },
  { name: 'Auto Electrician', category: 'Automotive', description: 'Vehicle electrical systems', tags: ['auto', 'car', 'electrical'] },
  { name: 'Panel Beater', category: 'Automotive', description: 'Auto body repair', tags: ['auto', 'car', 'body', 'dent'] },
  { name: 'Vulcanizer', category: 'Automotive', description: 'Tire repair and replacement', tags: ['auto', 'tire', 'wheel'] },
  { name: 'Car Wash', category: 'Automotive', description: 'Vehicle cleaning services', tags: ['auto', 'car', 'cleaning', 'wash'] },
  
  // Beauty & Personal Care
  { name: 'Hair Stylist', category: 'Beauty & Personal Care', description: 'Hair styling and treatments', tags: ['beauty', 'hair', 'styling'] },
  { name: 'Barber', category: 'Beauty & Personal Care', description: 'Haircuts and grooming', tags: ['beauty', 'hair', 'grooming', 'men'] },
  { name: 'Makeup Artist', category: 'Beauty & Personal Care', description: 'Professional makeup services', tags: ['beauty', 'makeup', 'cosmetics'] },
  { name: 'Braider', category: 'Beauty & Personal Care', description: 'Hair braiding specialist', tags: ['beauty', 'hair', 'braids'] },
  { name: 'Nail Technician', category: 'Beauty & Personal Care', description: 'Manicure and pedicure', tags: ['beauty', 'nails', 'manicure'] },
  { name: 'Loctician', category: 'Beauty & Personal Care', description: 'Dreadlock specialist', tags: ['beauty', 'hair', 'locs', 'dreadlocks'] },
  
  // Education & Tutoring
  { name: 'Tutor', category: 'Education & Tutoring', description: 'Academic tutoring services', tags: ['education', 'teaching', 'tutoring'] },
  { name: 'Music Teacher', category: 'Education & Tutoring', description: 'Music lessons and training', tags: ['education', 'music', 'teaching'] },
  { name: 'Driving Instructor', category: 'Education & Tutoring', description: 'Driving lessons and training', tags: ['education', 'driving', 'training'] },
  { name: 'Language Tutor', category: 'Education & Tutoring', description: 'Language teaching', tags: ['education', 'language', 'teaching'] },
  
  // Creative & Media
  { name: 'Photographer', category: 'Creative & Media', description: 'Professional photography', tags: ['creative', 'photography', 'media'] },
  { name: 'Videographer', category: 'Creative & Media', description: 'Video production services', tags: ['creative', 'video', 'media'] },
  { name: 'Graphic Designer', category: 'Creative & Media', description: 'Design and branding', tags: ['creative', 'design', 'graphics'] },
  { name: 'DJ', category: 'Creative & Media', description: 'Music mixing and entertainment', tags: ['creative', 'music', 'entertainment', 'events'] },
  { name: 'MC', category: 'Creative & Media', description: 'Event hosting and compere', tags: ['creative', 'events', 'hosting'] },
  
  // Healthcare
  { name: 'Nurse', category: 'Healthcare', description: 'Nursing care services', tags: ['health', 'medical', 'care'] },
  { name: 'Caregiver', category: 'Healthcare', description: 'Elderly and patient care', tags: ['health', 'care', 'elderly'] },
  { name: 'Physiotherapist', category: 'Healthcare', description: 'Physical therapy services', tags: ['health', 'therapy', 'rehabilitation'] },
  
  // Events & Catering
  { name: 'Caterer', category: 'Events & Catering', description: 'Event catering services', tags: ['food', 'catering', 'events'] },
  { name: 'Chef', category: 'Events & Catering', description: 'Professional cooking services', tags: ['food', 'cooking', 'chef'] },
  { name: 'Baker', category: 'Events & Catering', description: 'Baking and pastries', tags: ['food', 'baking', 'pastries'] },
  { name: 'Event Planner', category: 'Events & Catering', description: 'Event coordination and planning', tags: ['events', 'planning', 'coordination'] },
  { name: 'Decorator', category: 'Events & Catering', description: 'Event decoration services', tags: ['events', 'decoration', 'design'] },
  
  // Technology
  { name: 'Phone Repairer', category: 'Technology', description: 'Mobile phone repair', tags: ['tech', 'phone', 'repair', 'mobile'] },
  { name: 'Computer Technician', category: 'Technology', description: 'Computer repair and support', tags: ['tech', 'computer', 'repair', 'it'] },
  { name: 'Web Developer', category: 'Technology', description: 'Website development', tags: ['tech', 'web', 'development', 'coding'] },
  
  // Fashion & Tailoring
  { name: 'Tailor', category: 'Fashion & Tailoring', description: 'Clothing alterations and tailoring', tags: ['fashion', 'sewing', 'clothing'] },
  { name: 'Fashion Designer', category: 'Fashion & Tailoring', description: 'Custom clothing design', tags: ['fashion', 'design', 'clothing'] },
  { name: 'Shoemaker', category: 'Fashion & Tailoring', description: 'Shoe repair and making', tags: ['fashion', 'shoes', 'cobbler'] },
  
  // Cleaning
  { name: 'Cleaner', category: 'Cleaning', description: 'General cleaning services', tags: ['cleaning', 'home', 'office'] },
  { name: 'Laundry Attendant', category: 'Cleaning', description: 'Laundry and ironing services', tags: ['cleaning', 'laundry', 'washing'] },
  { name: 'Dry Cleaner', category: 'Cleaning', description: 'Professional dry cleaning', tags: ['cleaning', 'laundry', 'dry-clean'] },
  
  // Transportation
  { name: 'Driver', category: 'Transportation', description: 'Professional driving services', tags: ['transport', 'driving', 'chauffeur'] },
  { name: 'Dispatch Rider', category: 'Transportation', description: 'Delivery and courier services', tags: ['transport', 'delivery', 'courier'] },
  
  // Security
  { name: 'Security Guard', category: 'Security', description: 'Security and protection services', tags: ['security', 'protection', 'guard'] },
  
  // Construction
  { name: 'Bricklayer', category: 'Construction', description: 'Bricklaying services', tags: ['construction', 'building', 'bricks'] },
  { name: 'Roofer', category: 'Construction', description: 'Roofing installation and repair', tags: ['construction', 'roofing', 'building'] },
  
  // Agriculture
  { name: 'Gardener', category: 'Agriculture', description: 'Gardening and landscaping', tags: ['garden', 'landscaping', 'plants'] },
  { name: 'Farmer', category: 'Agriculture', description: 'Farming and crop production', tags: ['agriculture', 'farming', 'crops'] },
];