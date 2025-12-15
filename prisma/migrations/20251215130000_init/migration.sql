-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'VENDOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "NegotiationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "phone" TEXT,
    "city" TEXT,
    "photo" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" SERIAL NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "service_title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" NUMERIC(10,2) NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "image" TEXT,
    "avg_rating" NUMERIC(3,2) NOT NULL DEFAULT 0,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "negotiations" (
    "id" SERIAL NOT NULL,
    "service_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "offer_price" NUMERIC(10,2) NOT NULL,
    "status" "NegotiationStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "negotiations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" SERIAL NOT NULL,
    "service_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negotiations" ADD CONSTRAINT "negotiations_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negotiations" ADD CONSTRAINT "negotiations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes for query performance
CREATE INDEX "users_city_idx" ON "users"("city");

CREATE INDEX "services_vendor_id_idx" ON "services"("vendor_id");
CREATE INDEX "services_category_id_idx" ON "services"("category_id");
CREATE INDEX "services_city_idx" ON "services"("city");

CREATE INDEX "negotiations_service_id_idx" ON "negotiations"("service_id");
CREATE INDEX "negotiations_customer_id_idx" ON "negotiations"("customer_id");

CREATE INDEX "reviews_service_id_idx" ON "reviews"("service_id");
CREATE INDEX "reviews_customer_id_idx" ON "reviews"("customer_id");

-- Basic data integrity
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_range" CHECK ("rating" BETWEEN 1 AND 5);
