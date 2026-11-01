// Seed content: concept graph, question bank, teacher-approved notes (retrieval chunks),
// learners across Classes 6 to 10, resources and badges.

export const GRADES = [6, 7, 8, 9, 10];
// One shared concept pool, tagged with the classes that study each concept.
const GRADE_MAP = {
  c1: [6, 7, 8], c2: [6, 7, 8], c3: [7, 8, 9, 10], c4: [7, 8, 9, 10], c5: [8, 9, 10], c6: [6, 7, 8, 9, 10],
  c7: [7, 8, 9, 10], c8: [8, 9, 10], c9: [6, 7, 8, 10], c10: [7, 8, 10], c11: [6, 7, 8, 9], c12: [8, 9, 10],
};

export const concepts = [
  { id: 'c1', name: 'Integers', strand: 'Number sense', prereqs: [] },
  { id: 'c2', name: 'Fractions & Decimals', strand: 'Number sense', prereqs: [] },
  { id: 'c3', name: 'Rational Numbers', strand: 'Number sense', prereqs: ['c1', 'c2'] },
  { id: 'c4', name: 'Exponents & Powers', strand: 'Number sense', prereqs: ['c1'] },
  { id: 'c5', name: 'Squares & Square Roots', strand: 'Number sense', prereqs: ['c4'] },
  { id: 'c6', name: 'Algebraic Expressions', strand: 'Algebra', prereqs: ['c1'] },
  { id: 'c7', name: 'Linear Equations', strand: 'Algebra', prereqs: ['c6', 'c3'] },
  { id: 'c8', name: 'Factorisation', strand: 'Algebra', prereqs: ['c6', 'c4'] },
  { id: 'c9', name: 'Direct & Inverse Proportion', strand: 'Ratio & percentage', prereqs: ['c2'] },
  { id: 'c10', name: 'Comparing Quantities', strand: 'Ratio & percentage', prereqs: ['c2', 'c9'] },
  { id: 'c11', name: 'Understanding Quadrilaterals', strand: 'Geometry', prereqs: [] },
  { id: 'c12', name: 'Mensuration: Area', strand: 'Geometry', prereqs: ['c5', 'c11'] },
].map((c, i) => ({ ...c, short: ['Integers', 'Fractions', 'Rational', 'Exponents', 'Squares', 'Algebra', 'Equations', 'Factors', 'Proportion', 'Percent', 'Quads', 'Area'][i], order: i + 1, grades: GRADE_MAP[c.id], code: `SAR-M-C${String(i + 1).padStart(2, '0')}` }));

export const conceptsFor = (grade) => concepts.filter((c) => c.grades.includes(grade));

// [concept, difficulty, prompt, options, correct index, explanation]
const Q = [
  ['c1', 1, 'What is −7 + 12?', ['5', '−5', '19', '−19'], 0, 'Start at −7 and move 12 steps right on the number line: you land on 5.'],
  ['c1', 2, 'What is (−6) × (−4)?', ['−24', '24', '−10', '10'], 1, 'Two negative signs multiply to a positive: 6 × 4 = 24.'],
  ['c1', 2, 'Evaluate 15 − (−8).', ['7', '−7', '23', '−23'], 2, 'Subtracting a negative is adding its opposite: 15 + 8 = 23.'],
  ['c1', 3, 'What is (−48) ÷ (−6) + (−3)?', ['11', '5', '−5', '−11'], 1, '(−48) ÷ (−6) = 8, then 8 + (−3) = 5.'],

  ['c2', 1, 'What is 1/2 + 1/4?', ['2/6', '3/4', '1/6', '2/4'], 1, 'Write 1/2 as 2/4, then 2/4 + 1/4 = 3/4.'],
  ['c2', 2, 'What is 2/3 × 3/5?', ['5/8', '2/5', '6/8', '1/5'], 1, '(2×3)/(3×5) = 6/15, which simplifies to 2/5.'],
  ['c2', 2, 'What is 0.6 × 0.3?', ['1.8', '0.18', '0.018', '18'], 1, '6 × 3 = 18, and two decimal places in total gives 0.18.'],
  ['c2', 3, 'What is 3/4 ÷ 3/8?', ['9/32', '1/2', '2', '8/9'], 2, 'Multiply by the reciprocal: 3/4 × 8/3 = 2.'],

  ['c3', 1, 'Which of these is a rational number?', ['√2', 'π', '3/7', '√5'], 2, 'A rational number can be written as p/q with integers p and q (q ≠ 0). Only 3/7 fits.'],
  ['c3', 2, 'What is −3/4 + 1/2?', ['−1/4', '−1/2', '1/4', '−5/4'], 0, '1/2 = 2/4, so −3/4 + 2/4 = −1/4.'],
  ['c3', 2, 'Which number lies between 1/3 and 1/2?', ['1/4', '2/5', '3/5', '1/6'], 1, '2/5 = 0.4, which is between 0.333… and 0.5.'],
  ['c3', 3, 'What is the multiplicative inverse of −5/7?', ['5/7', '−7/5', '7/5', '−5/7'], 1, 'Flip the fraction and keep the sign: −7/5. Their product is 1.'],

  ['c4', 1, 'What is 2⁵?', ['10', '25', '32', '64'], 2, '2 × 2 × 2 × 2 × 2 = 32.'],
  ['c4', 2, 'Simplify 3⁴ × 3².', ['3⁸', '3⁶', '9⁶', '3²'], 1, 'Same base, so add the exponents: 4 + 2 = 6.'],
  ['c4', 2, 'What is 7⁰?', ['0', '1', '7', 'Not defined'], 1, 'Any non-zero number to the power 0 equals 1.'],
  ['c4', 3, 'Express 0.00042 in standard form.', ['4.2 × 10⁻⁴', '4.2 × 10⁻³', '4.2 × 10⁴', '0.42 × 10⁻³'], 0, 'Move the decimal point 4 places right to get 4.2, so the power is −4.'],

  ['c5', 1, 'What is the square of 13?', ['26', '169', '139', '196'], 1, '13 × 13 = 169.'],
  ['c5', 2, 'What is √144?', ['14', '12', '72', '16'], 1, '12 × 12 = 144.'],
  ['c5', 2, 'Which of these is a perfect square?', ['50', '72', '81', '98'], 2, '81 = 9 × 9.'],
  ['c5', 3, 'What is the smallest number to multiply 18 by to get a perfect square?', ['2', '3', '6', '9'], 0, '18 = 2 × 3 × 3. The factor 2 appears once, so multiply by 2 to get 36 = 6².'],

  ['c6', 1, 'In 5x + 3, what is the coefficient of x?', ['3', '5', 'x', '8'], 1, 'The coefficient is the number multiplying the variable.'],
  ['c6', 2, 'Simplify 3x + 5x − 2x.', ['6x', '10x', '6', '8x'], 0, 'Combine like terms: 3 + 5 − 2 = 6, so 6x.'],
  ['c6', 2, 'Expand (x + 3)(x + 2).', ['x² + 5x + 6', 'x² + 6', 'x² + 5x + 5', '2x + 5'], 0, 'x² + 2x + 3x + 6 = x² + 5x + 6.'],
  ['c6', 3, 'Subtract (2a − 3b) from (5a + b).', ['3a − 2b', '3a + 4b', '7a − 2b', '7a + 4b'], 1, '(5a + b) − (2a − 3b) = 3a + 4b.'],

  ['c7', 1, 'Solve x + 7 = 12.', ['19', '5', '−5', '7'], 1, 'Subtract 7 from both sides: x = 5.'],
  ['c7', 2, 'Solve 3x − 5 = 10.', ['5', '3', '15', '−5/3'], 0, 'Add 5 to get 3x = 15, then divide by 3: x = 5.'],
  ['c7', 2, 'Solve 2(x + 3) = 14.', ['4', '11', '5', '2'], 0, 'Divide by 2 to get x + 3 = 7, so x = 4.'],
  ['c7', 3, 'Solve x/3 + 2 = x/2 − 1.', ['6', '12', '18', '−18'], 2, 'Multiply by 6: 2x + 12 = 3x − 6, so x = 18.'],

  ['c8', 1, 'Factorise 6x + 9.', ['3(2x + 3)', '6(x + 9)', '3(2x + 9)', '2(3x + 9)'], 0, 'The highest common factor of 6 and 9 is 3.'],
  ['c8', 2, 'Factorise x² − 9.', ['(x − 3)²', '(x − 3)(x + 3)', '(x − 9)(x + 1)', 'x(x − 9)'], 1, 'Use a² − b² = (a − b)(a + b) with a = x, b = 3.'],
  ['c8', 2, 'Factorise x² + 5x + 6.', ['(x + 2)(x + 3)', '(x + 1)(x + 6)', '(x − 2)(x − 3)', '(x + 5)(x + 1)'], 0, 'Two numbers with product 6 and sum 5 are 2 and 3.'],
  ['c8', 3, 'Factorise 4x² − 12x + 9.', ['(2x − 3)²', '(2x + 3)²', '(4x − 3)(x − 3)', '(2x − 9)(2x − 1)'], 0, '4x² − 12x + 9 = (2x)² − 2(2x)(3) + 3² = (2x − 3)².'],

  ['c9', 1, 'If 5 pens cost ₹40, what do 8 pens cost?', ['₹60', '₹64', '₹72', '₹80'], 1, 'One pen costs ₹8, so 8 pens cost ₹64.'],
  ['c9', 2, '6 workers finish a job in 12 days. How many days will 9 workers take?', ['8', '18', '6', '9'], 0, 'Workers × days stays constant: 72 ÷ 9 = 8.'],
  ['c9', 2, 'Which pair varies inversely?', ['Speed and time for a fixed distance', 'Distance and time at a fixed speed', 'Cost and number of items', 'Side and perimeter of a square'], 0, 'For a fixed distance, a higher speed means less time.'],
  ['c9', 3, 'A car uses 12 L of fuel for 180 km. How many litres for 300 km?', ['18', '20', '25', '30'], 1, '12 ÷ 180 × 300 = 20 litres.'],

  ['c10', 1, 'What is 20% of 150?', ['20', '25', '30', '35'], 2, '20/100 × 150 = 30.'],
  ['c10', 2, 'A shirt marked ₹800 is sold at a 25% discount. What is the selling price?', ['₹200', '₹600', '₹775', '₹625'], 1, 'Discount = ₹200, so the price is 800 − 200 = ₹600.'],
  ['c10', 2, 'Cost price ₹500, selling price ₹600. What is the profit percent?', ['10%', '16.67%', '20%', '25%'], 2, 'Profit ₹100 ÷ cost price ₹500 × 100 = 20%.'],
  ['c10', 3, 'What is the simple interest on ₹2000 at 5% per year for 3 years?', ['₹100', '₹300', '₹315', '₹3,000'], 1, 'I = P × R × T ÷ 100 = 2000 × 5 × 3 ÷ 100 = ₹300.'],

  ['c11', 1, 'How many sides does a quadrilateral have?', ['3', '4', '5', '6'], 1, 'Quad means four.'],
  ['c11', 2, 'What is the sum of the interior angles of a quadrilateral?', ['180°', '270°', '360°', '540°'], 2, 'A quadrilateral splits into two triangles: 2 × 180° = 360°.'],
  ['c11', 2, 'Which quadrilateral has equal diagonals that bisect each other at right angles?', ['Rectangle', 'Rhombus', 'Square', 'Parallelogram'], 2, 'Only a square has both equal and perpendicular diagonals.'],
  ['c11', 3, 'Three angles of a quadrilateral are 80°, 95° and 110°. What is the fourth?', ['65°', '75°', '85°', '95°'], 1, '360° − (80° + 95° + 110°) = 75°.'],

  ['c12', 1, 'What is the area of a rectangle 8 cm by 5 cm?', ['13 cm²', '26 cm²', '40 cm²', '80 cm²'], 2, 'Length × breadth = 8 × 5 = 40 cm².'],
  ['c12', 2, 'What is the area of a triangle with base 10 cm and height 6 cm?', ['60 cm²', '30 cm²', '16 cm²', '36 cm²'], 1, '½ × 10 × 6 = 30 cm².'],
  ['c12', 2, 'What is the area of a trapezium with parallel sides 6 cm and 10 cm and height 4 cm?', ['64 cm²', '32 cm²', '24 cm²', '40 cm²'], 1, '½ × (6 + 10) × 4 = 32 cm².'],
  ['c12', 3, 'A square has an area of 144 cm². What is its perimeter?', ['24 cm', '36 cm', '48 cm', '144 cm'], 2, 'Side = √144 = 12 cm, so the perimeter is 4 × 12 = 48 cm.'],
];

export const questions = Q.map(([conceptId, difficulty, prompt, options, answer, explanation], i) => ({
  id: `q${i + 1}`, conceptId, difficulty, prompt, options, answer, explanation,
}));

// Teacher-approved notes the tutor retrieves from. [concept, section, status, keywords, text]
const N = [
  ['c1', 'Key idea', 'Approved', 'integer negative positive number line sign add subtract multiply divide opposite',
    'Integers are whole numbers and their negatives, shown on a number line with zero in the middle. To add a positive number, move right; to add a negative number, move left. Multiplying two integers with the same sign gives a positive result, and with different signs gives a negative result.'],
  ['c1', 'Worked example', 'Approved', 'integer negative subtract number line',
    'Worked example: −7 + 12. Start at −7 on the number line and move 12 steps right. You pass zero after 7 steps and land on 5. Subtracting a negative, like 15 − (−8), is the same as adding its opposite: 15 + 8 = 23.'],
  ['c2', 'Key idea', 'Approved', 'fraction decimal denominator numerator reciprocal simplify common',
    'To add or subtract fractions, first write them with a common denominator, then add the numerators. To multiply fractions, multiply numerators and denominators, then simplify. To divide by a fraction, multiply by its reciprocal.'],
  ['c2', 'Worked example', 'Approved', 'fraction divide decimal multiply',
    'Worked example: 3/4 ÷ 3/8. Flip the second fraction to get 8/3 and multiply: 3/4 × 8/3 = 24/12 = 2. For decimals, multiply as whole numbers and then place the decimal point so the answer has as many decimal places as both factors together: 0.6 × 0.3 = 0.18.'],
  ['c3', 'Key idea', 'Approved', 'rational p/q inverse reciprocal between numbers integers',
    'A rational number is any number that can be written as p/q where p and q are integers and q is not zero. Between any two rational numbers there are infinitely many more. Every rational number except zero has a multiplicative inverse, found by flipping p/q to q/p.'],
  ['c3', 'Worked example', 'Approved', 'rational add between fraction',
    'Worked example: −3/4 + 1/2. Write 1/2 as 2/4, then add numerators: −3 + 2 = −1, so the sum is −1/4. A rational number between 1/3 and 1/2 is 2/5 because 0.333… < 0.4 < 0.5.'],
  ['c4', 'Key idea', 'Approved', 'exponent exponents power powers base index law zero negative standard form',
    'An exponent tells you how many times to multiply the base by itself, so 2⁵ = 2 × 2 × 2 × 2 × 2 = 32. When multiplying powers with the same base, add the exponents; when dividing, subtract them. Any non-zero number raised to the power 0 equals 1, and a negative exponent means a reciprocal: a⁻ⁿ = 1/aⁿ.'],
  ['c4', 'Worked example', 'Approved', 'exponent power standard form scientific notation',
    'Worked example: 3⁴ × 3² = 3⁴⁺² = 3⁶ = 729. To write 0.00042 in standard form, move the decimal point 4 places right to get 4.2 and record the move as a negative power: 4.2 × 10⁻⁴.'],
  ['c5', 'Key idea', 'Approved', 'square squares root roots perfect prime factorisation',
    'The square of a number is the number multiplied by itself, and a square root undoes squaring: √144 = 12 because 12 × 12 = 144. A perfect square has every prime factor appearing an even number of times. Square roots of larger numbers can be found by prime factorisation.'],
  ['c5', 'Worked example', 'Approved', 'perfect square prime factors multiplier',
    'Worked example: make 18 a perfect square. The prime factors of 18 are 2 × 3 × 3. The factor 2 appears once, so multiply by 2 to get 36 = 6². The smallest multiplier is 2.'],
  ['c6', 'Key idea', 'Approved', 'algebra expression variable term coefficient like terms expand multiply simplify',
    'An algebraic expression combines numbers, variables and operations, such as 5x + 3. Terms with the same variable part are like terms and can be added or subtracted by combining their coefficients. To multiply two expressions, multiply every term in the first by every term in the second.'],
  ['c6', 'Worked example', 'Approved', 'expand expression multiply brackets',
    'Worked example: expand (x + 3)(x + 2). Multiply each term: x·x + x·2 + 3·x + 3·2 = x² + 2x + 3x + 6. Combine like terms to get x² + 5x + 6.'],
  ['c7', 'Key idea', 'Approved', 'linear equation equations solve variable balance unknown transposing x',
    'A linear equation in one variable says two expressions are equal, and solving it means finding the value of the variable that makes it true. Keep the equation balanced: whatever you do to one side, do to the other. Collect variable terms on one side and numbers on the other, then divide by the coefficient.'],
  ['c7', 'Worked example', 'Approved', 'solve equation x check',
    'Worked example: 3x − 5 = 10. Add 5 to both sides to get 3x = 15. Divide both sides by 3 to get x = 5. Check: 3(5) − 5 = 10, so the solution is correct.'],
  ['c8', 'Key idea', 'Approved', 'factorise factorisation factorising factor identity common quadratic',
    'Factorising writes an expression as a product of simpler factors. First take out the highest common factor, then look for identities such as a² − b² = (a − b)(a + b) and (a ± b)² = a² ± 2ab + b². For x² + bx + c, find two numbers that multiply to c and add to b.'],
  ['c8', 'Worked example', 'Draft', 'factorise quadratic trinomial',
    'Worked example: x² + 5x + 6. Find two numbers with product 6 and sum 5; they are 2 and 3. So x² + 5x + 6 = (x + 2)(x + 3). Expanding the answer is a quick way to check it.'],
  ['c9', 'Key idea', 'Approved', 'direct inverse proportion unitary method ratio workers',
    'Two quantities are in direct proportion when they increase or decrease together at the same ratio. They are in inverse proportion when one increases as the other decreases so that their product stays constant. Use the unitary method: find the value of one unit first, then scale up.'],
  ['c9', 'Worked example', 'Approved', 'inverse proportion workers days',
    'Worked example: 6 workers finish a job in 12 days. Workers and days are inversely proportional, so the product 6 × 12 = 72 stays constant. With 9 workers, days = 72 ÷ 9 = 8.'],
  ['c10', 'Key idea', 'Approved', 'percent percentage profit loss discount interest',
    'A percentage is a fraction out of 100. To find p% of a quantity, multiply the quantity by p/100. Profit % = (profit ÷ cost price) × 100, discount is taken off the marked price, and simple interest is I = P × R × T ÷ 100.'],
  ['c10', 'Worked example', 'Approved', 'discount selling price percent',
    'Worked example: a shirt marked ₹800 has a 25% discount. Discount = 25/100 × 800 = ₹200, so the selling price is 800 − 200 = ₹600.'],
  ['c11', 'Key idea', 'Approved', 'quadrilateral parallelogram rhombus rectangle square trapezium angle diagonals',
    'A quadrilateral has four sides and its interior angles always add up to 360°. A parallelogram has two pairs of parallel sides, and its diagonals bisect each other. A rhombus has four equal sides, a rectangle has four right angles, and a square is both.'],
  ['c11', 'Worked example', 'Approved', 'quadrilateral angle sum missing',
    'Worked example: three angles of a quadrilateral are 80°, 95° and 110°. Their sum is 285°. The fourth angle is 360° − 285° = 75°.'],
  ['c12', 'Key idea', 'Approved', 'area perimeter mensuration triangle trapezium rectangle square cm',
    'Area measures the surface a shape covers, in square units. Rectangle: length × breadth. Triangle: ½ × base × height. Trapezium: ½ × (sum of parallel sides) × height. The perimeter of a square is four times its side.'],
  ['c12', 'Worked example', 'Approved', 'trapezium area',
    'Worked example: trapezium with parallel sides 6 cm and 10 cm and height 4 cm. Area = ½ × (6 + 10) × 4 = ½ × 16 × 4 = 32 cm².'],
];

export const chunks = N.map(([conceptId, section, status, keywords, text], i) => {
  const c = concepts.find((x) => x.id === conceptId);
  return {
    id: `n${i + 1}`, conceptId, section, status, keywords, text,
    title: c.name, code: c.code, version: status === 'Draft' ? 'v0.9' : i % 5 === 0 ? 'v1.2' : 'v1.1',
    page: section === 'Key idea' ? 1 : 2,
  };
});

export const badgeDefs = [
  { id: 'first_step', name: 'First Step', desc: 'Answer your first question correctly' },
  { id: 'on_a_roll', name: 'On a Roll', desc: 'Get 5 correct answers in a row' },
  { id: 'streak_3', name: '3-Day Streak', desc: 'Learn on 3 days in a row' },
  { id: 'streak_7', name: 'Week Warrior', desc: 'Learn on 7 days in a row' },
  { id: 'mastery_1', name: 'Concept Mastered', desc: 'Reach 80% mastery on any concept' },
  { id: 'gap_closer', name: 'Gap Closer', desc: 'Lift a weak concept above 80%' },
];

const DAY = 86400000;
const hash = (s) => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };

// [id, name, ability, overrides, daysSinceActive, streak, xp, badges]
// [id, name, ability, overrides, days since active, streak, xp, badges, class]
const B1 = ['first_step'];
const B2 = ['first_step', 'streak_3', 'mastery_1'];
const S = [
  ['s1', 'Aarav', 0.72, { c4: 0.22 }, 1, 6, 420, B2, 8],
  ['s2', 'Diya', 0.74, {}, 0, 4, 380, B2, 8],
  ['s3', 'Karthik', 0.55, { c6: 0.18 }, 6, 0, 150, B1, 8],
  ['s4', 'Meera', 0.88, {}, 0, 11, 690, ['first_step', 'on_a_roll', 'streak_3', 'streak_7', 'mastery_1'], 8],
  ['s5', 'Neha', 0.5, { c2: 0.15 }, 4, 0, 120, B1, 8],
  ['s6', 'Rohan', 0.66, { c9: 0.25 }, 2, 2, 260, ['first_step', 'mastery_1'], 8],
  ['s7', 'Zoya', 0.93, {}, 0, 15, 840, ['first_step', 'on_a_roll', 'streak_3', 'streak_7', 'mastery_1', 'gap_closer'], 8],
  ['s8', 'Ishaan', 0.7, {}, 0, 3, 210, B2, 6],
  ['s9', 'Anaya', 0.82, {}, 1, 8, 330, B2, 6],
  ['s10', 'Vihaan', 0.48, { c1: 0.2 }, 5, 0, 90, B1, 6],
  ['s11', 'Kavya', 0.78, {}, 0, 5, 300, B2, 7],
  ['s12', 'Arjun', 0.6, { c6: 0.25 }, 2, 1, 170, B1, 7],
  ['s13', 'Saanvi', 0.9, {}, 0, 12, 540, B2, 7],
  ['s14', 'Reyansh', 0.68, {}, 1, 4, 240, B2, 9],
  ['s15', 'Myra', 0.85, {}, 0, 9, 470, B2, 9],
  ['s16', 'Advait', 0.52, { c8: 0.2 }, 4, 0, 130, B1, 9],
  ['s17', 'Ananya', 0.84, {}, 0, 10, 520, ['first_step', 'on_a_roll', 'streak_3', 'mastery_1'], 10],
  ['s18', 'Kabir', 0.6, { c8: 0.2 }, 1, 2, 260, B2, 10],
  ['s19', 'Tanvi', 0.72, {}, 0, 6, 340, B2, 10],
  ['s20', 'Rishi', 0.46, { c7: 0.2 }, 3, 0, 140, B1, 10],
];

export function buildStudents(now = Date.now()) {
  return S.map(([id, name, ability, over, idle, streak, xp, badges, grade]) => {
    const mastery = {};
    for (const c of concepts) {
      const noise = ((hash(id + c.id) % 1000) / 1000 - 0.5) * 0.24;
      let p = ability + noise;
      if (c.prereqs.length) {
        const avg = c.prereqs.reduce((a, q) => a + mastery[q], 0) / c.prereqs.length;
        p = Math.min(p, avg + 0.2);
      }
      p = over[c.id] ?? p;
      mastery[c.id] = Math.round(Math.min(0.97, Math.max(0.05, p)) * 100) / 100;
    }
    const activity = {};
    // A year of daily activity: busier for stronger learners, quieter at weekends, and growing over time.
    for (let d = 0; d < 364; d++) {
      if (d < idle) continue;
      const day = new Date(now - d * DAY);
      const key = day.toISOString().slice(0, 10);
      const weekend = day.getUTCDay() === 0 || day.getUTCDay() === 6;
      const p = (0.2 + ability * 0.6) * (weekend ? 0.6 : 1) * (0.5 + 0.5 * (1 - d / 364));
      if ((hash(id + key + 'p') % 1000) / 1000 < p) activity[key] = 1 + (hash(id + key) % Math.round(4 + ability * 12));
    }
    const solved = {};
    for (const c of concepts) {
      const m = c.grades.includes(grade) ? mastery[c.id] : 0;
      solved[c.id] = {
        1: Math.round(m * 7) + (hash(id + c.id + 'a') % 3),
        2: Math.round(Math.max(0, m - 0.15) * 7) + (hash(id + c.id + 'b') % 2),
        3: Math.round(Math.max(0, m - 0.45) * 9),
      };
    }
    return {
      id, name, grade, mastery, state: {}, solved, pending: {}, contestRuns: {}, activity, streak, xp, badges,
      lastActiveAt: new Date(now - idle * DAY - (hash(id) % 6) * 3600000).toISOString(),
      lastActiveDate: new Date(now - idle * DAY).toISOString().slice(0, 10),
      diagnostic: null, history: [], answered: 0, correctRun: 0,
    };
  });
}

export const resources = [
  ['Integers: operations worksheet', 'Worksheet', 'c1', 'English', 'Approved', 'Teacher'],
  ['Fractions & decimals practice set', 'Worksheet', 'c2', 'English', 'Approved', 'Teacher'],
  ['Fractions & decimals practice set', 'Worksheet', 'c2', 'Hindi', 'Pending review', 'AI draft'],
  ['Exponents: laws of indices worksheet', 'Worksheet', 'c4', 'English', 'Approved', 'Teacher'],
  ['Exponents: laws of indices worksheet', 'Worksheet', 'c4', 'Telugu', 'Pending review', 'AI draft'],
  ['Exponents: class talking points', 'Talking points', 'c4', 'English', 'Approved', 'AI draft'],
  ['Algebraic expressions: like terms', 'Worksheet', 'c6', 'English', 'Approved', 'Teacher'],
  ['Linear equations: balance method', 'Worksheet', 'c7', 'English', 'Approved', 'Teacher'],
  ['Linear equations: class talking points', 'Talking points', 'c7', 'Hindi', 'Pending review', 'AI draft'],
  ['Factorisation: identities worksheet', 'Worksheet', 'c8', 'English', 'Draft', 'AI draft'],
  ['Proportion: unitary method set', 'Worksheet', 'c9', 'English', 'Approved', 'Teacher'],
  ['Proportion: class talking points', 'Talking points', 'c9', 'English', 'Approved', 'AI draft'],
  ['Percentages: parent summary', 'Parent summary', 'c10', 'Hindi', 'Pending review', 'AI draft'],
  ['Quadrilaterals: properties chart', 'Worksheet', 'c11', 'English', 'Approved', 'Teacher'],
  ['Area: formulas worksheet', 'Worksheet', 'c12', 'English', 'Approved', 'Teacher'],
  ['Weekly progress summary (WhatsApp)', 'Parent summary', 'c7', 'English', 'Approved', 'AI draft'],
  // class 6, 7, 9 and 10 starter worksheets
  ['Fractions and decimals practice set', 'Worksheet', 'c2', 'English', 'Approved', 'Teacher', 6],
  ['Introduction to algebra worksheet', 'Worksheet', 'c6', 'English', 'Approved', 'Teacher', 6],
  ['Rational numbers: operations worksheet', 'Worksheet', 'c3', 'English', 'Approved', 'Teacher', 7],
  ['Simple equations practice set', 'Worksheet', 'c7', 'Hindi', 'Pending review', 'AI draft', 7],
  ['Laws of exponents worksheet', 'Worksheet', 'c4', 'English', 'Approved', 'Teacher', 9],
  ['Factorisation: identities set', 'Worksheet', 'c8', 'English', 'Draft', 'AI draft', 9],
  ['Linear equations: board-style set', 'Worksheet', 'c7', 'English', 'Approved', 'Teacher', 10],
  ['Percentage, profit and interest set', 'Worksheet', 'c10', 'English', 'Approved', 'Teacher', 10],
].map(([title, type, conceptId, language, status, author, grade = 8], i) => ({
  id: `r${i + 1}`, title, type, conceptId, language, status, author, grade, description: '', link: null, file: null,
  version: `v1.${i % 3}`, code: `SAR-RES-${String(i + 1).padStart(3, '0')}`,
  updatedAt: new Date(Date.now() - (i % 9) * DAY - i * 3600000).toISOString(),
}));

// Demo sign-in details for local development. Shown on the login screen when NODE_ENV is not "production".
export const DEMO = {
  studentPassword: process.env.SAARTHI_STUDENT_PASSWORD || 'student123',
  teacherPassword: process.env.SAARTHI_TEACHER_PASSWORD || 'teacher123',
  teacher: { id: 't1', name: 'Ms. Lakshmi', username: 'lakshmi' },
};
