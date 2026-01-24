
-- Create enums
CREATE TYPE public.user_role AS ENUM ('buyer', 'seller', 'admin');
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.seller_type AS ENUM ('individual', 'shop');
CREATE TYPE public.submission_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.listing_status AS ENUM ('available', 'reserved', 'sold', 'expired');
CREATE TYPE public.offer_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE public.report_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');
CREATE TYPE public.promotion_type AS ENUM ('featured', 'boost', 'banner');
CREATE TYPE public.item_condition AS ENUM ('new', 'like_new', 'good', 'fair', 'poor');

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  parent_id UUID REFERENCES public.categories(id),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create profiles table (for user info)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'buyer',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_roles table for RLS (admin detection)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create sellers table
CREATE TABLE public.sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  type seller_type DEFAULT 'individual',
  shop_name TEXT,
  verified BOOLEAN DEFAULT false,
  trust_score INT DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),
  region TEXT NOT NULL,
  whatsapp TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create submissions table
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id),
  brand TEXT,
  model TEXT,
  condition item_condition DEFAULT 'good',
  price_ils DECIMAL(10,2) NOT NULL CHECK (price_ils > 0),
  region TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  status submission_status DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create listings table
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE NOT NULL,
  submission_id UUID REFERENCES public.submissions(id),
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id),
  brand TEXT,
  model TEXT,
  condition item_condition DEFAULT 'good',
  price_ils DECIMAL(10,2) NOT NULL CHECK (price_ils > 0),
  region TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  status listing_status DEFAULT 'available',
  featured BOOLEAN DEFAULT false,
  view_count INT DEFAULT 0,
  save_count INT DEFAULT 0,
  whatsapp_click_count INT DEFAULT 0,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create offers table
CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  offer_price_ils DECIMAL(10,2) NOT NULL CHECK (offer_price_ils > 0),
  message TEXT,
  status offer_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create reports table
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status report_status DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create promotions table
CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  type promotion_type NOT NULL,
  start_at TIMESTAMPTZ DEFAULT now(),
  end_at TIMESTAMPTZ NOT NULL,
  price_ils DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create saved_listings table (for inquiry cart / favorites)
CREATE TABLE public.saved_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

-- Create submission_rate_limits table for spam prevention
CREATE TABLE public.submission_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  submission_count INT DEFAULT 1,
  date DATE DEFAULT CURRENT_DATE,
  UNIQUE(phone, date)
);

-- Create has_role function for RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Create function to get seller_id for a user
CREATE OR REPLACE FUNCTION public.get_seller_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.sellers WHERE user_id = _user_id LIMIT 1
$$;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sellers_updated_at
  BEFORE UPDATE ON public.sellers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories (public read)
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Only admins can manage categories" ON public.categories FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Only admins can manage roles" ON public.user_roles FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for sellers
CREATE POLICY "Sellers are viewable by everyone" ON public.sellers FOR SELECT USING (true);
CREATE POLICY "Users can create their seller profile" ON public.sellers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Sellers can update own profile" ON public.sellers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all sellers" ON public.sellers FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for submissions
CREATE POLICY "Sellers can view own submissions" ON public.submissions FOR SELECT USING (
  seller_id = public.get_seller_id(auth.uid()) OR public.is_admin(auth.uid())
);
CREATE POLICY "Sellers can create submissions" ON public.submissions FOR INSERT WITH CHECK (
  seller_id = public.get_seller_id(auth.uid())
);
CREATE POLICY "Sellers can update own pending submissions" ON public.submissions FOR UPDATE USING (
  seller_id = public.get_seller_id(auth.uid()) AND status = 'pending'
);
CREATE POLICY "Admins can manage all submissions" ON public.submissions FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for listings (public read for available)
CREATE POLICY "Available listings are viewable by everyone" ON public.listings FOR SELECT USING (
  status = 'available' OR 
  seller_id = public.get_seller_id(auth.uid()) OR 
  public.is_admin(auth.uid())
);
CREATE POLICY "Only admins can create listings" ON public.listings FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Only admins can update listings" ON public.listings FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Only admins can delete listings" ON public.listings FOR DELETE USING (public.is_admin(auth.uid()));

-- RLS Policies for offers
CREATE POLICY "Buyers can view own offers" ON public.offers FOR SELECT USING (
  buyer_id = auth.uid() OR 
  listing_id IN (SELECT id FROM public.listings WHERE seller_id = public.get_seller_id(auth.uid())) OR
  public.is_admin(auth.uid())
);
CREATE POLICY "Authenticated users can create offers" ON public.offers FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Sellers can update offers on their listings" ON public.offers FOR UPDATE USING (
  listing_id IN (SELECT id FROM public.listings WHERE seller_id = public.get_seller_id(auth.uid()))
);

-- RLS Policies for reviews
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = reviewer_id);

-- RLS Policies for reports
CREATE POLICY "Users can view own reports" ON public.reports FOR SELECT USING (
  reporter_id = auth.uid() OR public.is_admin(auth.uid())
);
CREATE POLICY "Authenticated users can create reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins can manage reports" ON public.reports FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for promotions
CREATE POLICY "Active promotions are viewable by everyone" ON public.promotions FOR SELECT USING (
  end_at > now() OR public.is_admin(auth.uid())
);
CREATE POLICY "Only admins can manage promotions" ON public.promotions FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for saved_listings
CREATE POLICY "Users can view own saved listings" ON public.saved_listings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save listings" ON public.saved_listings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave listings" ON public.saved_listings FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for rate limits (admin only)
CREATE POLICY "Only admins can view rate limits" ON public.submission_rate_limits FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "System can insert rate limits" ON public.submission_rate_limits FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update rate limits" ON public.submission_rate_limits FOR UPDATE USING (true);

-- Create indexes for performance
CREATE INDEX idx_listings_category ON public.listings(category_id);
CREATE INDEX idx_listings_region ON public.listings(region);
CREATE INDEX idx_listings_status ON public.listings(status);
CREATE INDEX idx_listings_seller ON public.listings(seller_id);
CREATE INDEX idx_listings_price ON public.listings(price_ils);
CREATE INDEX idx_listings_published ON public.listings(published_at DESC);
CREATE INDEX idx_submissions_seller ON public.submissions(seller_id);
CREATE INDEX idx_submissions_status ON public.submissions(status);
CREATE INDEX idx_offers_listing ON public.offers(listing_id);
CREATE INDEX idx_reviews_seller ON public.reviews(seller_id);

-- Enable pg_trgm extension for typo-tolerant search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index for full-text search
CREATE INDEX idx_listings_title_trgm ON public.listings USING GIN (title gin_trgm_ops);
CREATE INDEX idx_listings_description_trgm ON public.listings USING GIN (description gin_trgm_ops);

-- Insert default categories
INSERT INTO public.categories (name_ar, name_en, slug, icon, sort_order) VALUES
('إلكترونيات', 'Electronics', 'electronics', 'Smartphone', 1),
('ملابس وأزياء', 'Fashion', 'fashion', 'Shirt', 2),
('منزل وحديقة', 'Home & Garden', 'home-garden', 'Home', 3),
('سيارات ومركبات', 'Vehicles', 'vehicles', 'Car', 4),
('رياضة وترفيه', 'Sports', 'sports', 'Dumbbell', 5),
('كتب وتعليم', 'Books & Education', 'books', 'BookOpen', 6),
('خدمات', 'Services', 'services', 'Briefcase', 7),
('أخرى', 'Other', 'other', 'Package', 8);

-- Insert sub-categories for Electronics
INSERT INTO public.categories (name_ar, name_en, slug, icon, parent_id, sort_order)
SELECT 'هواتف', 'Phones', 'phones', 'Smartphone', id, 1 FROM public.categories WHERE slug = 'electronics'
UNION ALL
SELECT 'حواسيب', 'Computers', 'computers', 'Laptop', id, 2 FROM public.categories WHERE slug = 'electronics'
UNION ALL
SELECT 'أجهزة منزلية', 'Appliances', 'appliances', 'Tv', id, 3 FROM public.categories WHERE slug = 'electronics';
